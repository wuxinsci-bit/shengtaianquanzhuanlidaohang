import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { getDatabase } from "@/db/bootstrap";

const SESSION_COOKIE = "eco_security_session";
const SESSION_DAYS = 7;
const PBKDF2_ITERATIONS = 100_000;
const DEFAULT_USERNAME = "2025FR002";
const DEFAULT_PASSWORD = "2025FR002";

export type AppUser = {
  id: number;
  username: string;
  email: string;
  displayName: string;
  institution: string;
  role: string;
  status: string;
  auditStatus: string;
};

type UserRow = AppUser & { password_hash: string; password_salt: string };

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function safeText(value: unknown, max = 200) {
  return String(value ?? "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

function userFromRow(row: UserRow): AppUser {
  return {
    id: Number(row.id),
    username: row.username,
    email: row.email,
    displayName: row.displayName,
    institution: row.institution,
    role: row.role,
    status: row.status,
    auditStatus: row.auditStatus,
  };
}

async function digest(value: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toBase64Url(new Uint8Array(hash));
}

async function hashPassword(password: string, salt = crypto.getRandomValues(new Uint8Array(16))) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" }, key, 256);
  return { hash: toBase64Url(new Uint8Array(bits)), salt: toBase64Url(salt) };
}

function equalBytes(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left[index] ^ right[index];
  return mismatch === 0;
}

async function verifyPassword(password: string, hash: string, salt: string) {
  const result = await hashPassword(password, fromBase64Url(salt));
  return equalBytes(fromBase64Url(result.hash), fromBase64Url(hash));
}

function cookieHeader(token: string, maxAge = SESSION_DAYS * 24 * 60 * 60) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

function clearCookieHeader() {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export async function ensureDefaultAccount() {
  const database = await getDatabase();
  const existing = await database.prepare("SELECT id FROM app_users WHERE username=? LIMIT 1").bind(DEFAULT_USERNAME).first<{ id: number }>();
  if (existing) return;
  const password = await hashPassword(DEFAULT_PASSWORD);
  await database.prepare(`INSERT INTO app_users
    (username, email, display_name, institution, role, password_hash, password_salt, status, audit_status, audit_reason)
    VALUES (?, '', '项目管理员', '中南林业科技大学 / 长沙遥测信息科技有限公司', '项目管理员', ?, ?, 'approved', 'auto-approved', '项目初始账号')`)
    .bind(DEFAULT_USERNAME, password.hash, password.salt).run();
  await database.prepare("INSERT INTO auth_audit_logs(username, action, result, reason) VALUES(?, 'bootstrap', 'approved', '项目初始账号')").bind(DEFAULT_USERNAME).run();
}

export async function getCurrentUserFromToken(token: string | null | undefined): Promise<AppUser | null> {
  if (!token) return null;
  const database = await getDatabase();
  const tokenHash = await digest(token);
  const row = await database.prepare(`SELECT
    u.id, u.username, u.email, u.display_name AS displayName, u.institution,
    u.role, u.status, u.audit_status AS auditStatus,
    u.password_hash, u.password_salt
    FROM app_sessions s JOIN app_users u ON u.id=s.user_id
    WHERE s.token_hash=? AND s.expires_at > CURRENT_TIMESTAMP AND u.status='approved'
    LIMIT 1`).bind(tokenHash).first<UserRow>();
  return row ? userFromRow(row) : null;
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  return getCurrentUserFromToken(cookieStore.get(SESSION_COOKIE)?.value);
}

export async function requireAppUser(returnTo: string): Promise<AppUser> {
  const user = await getCurrentUser();
  if (user) return user;
  redirect(`/login?next=${encodeURIComponent(returnTo.startsWith("/") ? returnTo : "/home")}`);
}

export async function requireApiUser(request: Request): Promise<AppUser | null> {
  const cookieHeaderValue = request.headers.get("cookie") ?? "";
  const token = cookieHeaderValue.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.split("=").slice(1).join("=");
  return getCurrentUserFromToken(token);
}

export async function loginUser(usernameInput: unknown, passwordInput: unknown) {
  await ensureDefaultAccount();
  const username = safeText(usernameInput, 64);
  const password = String(passwordInput ?? "");
  const database = await getDatabase();
  const row = await database.prepare(`SELECT
    id, username, email, display_name AS displayName, institution, role, status,
    audit_status AS auditStatus, password_hash, password_salt
    FROM app_users WHERE username=? COLLATE NOCASE LIMIT 1`).bind(username).first<UserRow>();
  if (!row || !(await verifyPassword(password, row.password_hash, row.password_salt)) || row.status !== "approved") {
    await database.prepare("INSERT INTO auth_audit_logs(username, action, result, reason) VALUES(?, 'login', 'rejected', '账号或密码错误')").bind(username || "未填写").run();
    throw new Error("账号或密码错误，或账号尚未通过自动审核");
  }
  const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
  const token = toBase64Url(tokenBytes);
  const tokenHash = await digest(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString().replace("T", " ").replace("Z", "");
  await database.batch([
    database.prepare("DELETE FROM app_sessions WHERE expires_at <= CURRENT_TIMESTAMP"),
    database.prepare("INSERT INTO app_sessions(token_hash, user_id, expires_at) VALUES(?, ?, ?)").bind(tokenHash, row.id, expiresAt),
    database.prepare("UPDATE app_users SET last_login_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(row.id),
    database.prepare("INSERT INTO auth_audit_logs(username, action, result, reason) VALUES(?, 'login', 'approved', '登录成功')").bind(row.username),
  ]);
  return { user: userFromRow(row), token };
}

export async function registerUser(input: Record<string, unknown>) {
  const username = safeText(input.username, 64);
  const password = String(input.password ?? "");
  const displayName = safeText(input.displayName, 60);
  const institution = safeText(input.institution, 160);
  const email = safeText(input.email, 160).toLowerCase();
  const role = safeText(input.role, 40) || "学习者";
  const issues: string[] = [];
  if (!/^[\p{L}\p{N}._-]{3,32}$/u.test(username)) issues.push("账号需为3—32位字母、数字、中文、下划线或短横线");
  if (username.toLowerCase() === "admin" || username.toLowerCase() === "root" || username.toLowerCase() === "system") issues.push("该账号名称保留，不能注册");
  if (password.length < 8 || password.length > 72) issues.push("密码长度应为8—72位");
  if (displayName.length < 2) issues.push("请填写真实姓名或团队名称");
  if (institution.length < 2) issues.push("请填写所属单位");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) issues.push("邮箱格式不正确");
  const database = await getDatabase();
  if (issues.length) {
    await database.prepare("INSERT INTO auth_audit_logs(username, action, result, reason) VALUES(?, 'register', 'rejected', ?)").bind(username || "未填写", issues.join("；")).run();
    throw new Error(`自动审核未通过：${issues.join("；")}`);
  }
  const exists = await database.prepare("SELECT id FROM app_users WHERE username=? COLLATE NOCASE LIMIT 1").bind(username).first<{ id: number }>();
  if (exists) throw new Error("该账号已存在，请直接登录");
  const passwordRecord = await hashPassword(password);
  try {
    const row = await database.prepare(`INSERT INTO app_users
      (username, email, display_name, institution, role, password_hash, password_salt, status, audit_status, audit_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', 'auto-approved', '资料完整、格式合规，系统自动通过')
      RETURNING id, username, email, display_name AS displayName, institution, role, status, audit_status AS auditStatus`)
      .bind(username, email, displayName, institution, role, passwordRecord.hash, passwordRecord.salt).first<AppUser>();
    if (!row) throw new Error("注册失败，请稍后重试");
    await database.prepare("INSERT INTO auth_audit_logs(username, action, result, reason) VALUES(?, 'register', 'approved', '资料完整、格式合规，系统自动通过')").bind(username).run();
    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const token = toBase64Url(tokenBytes);
    await database.prepare("INSERT INTO app_sessions(token_hash, user_id, expires_at) VALUES(?, ?, ?)").bind(await digest(token), row.id, new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString().replace("T", " ").replace("Z", "")).run();
    return { user: row, token };
  } catch (error) {
    if (/UNIQUE|unique/.test(String(error))) throw new Error("该账号已存在，请直接登录");
    throw error;
  }
}

export async function logoutUser(token: string | null | undefined) {
  if (!token) return;
  const database = await getDatabase();
  await database.prepare("DELETE FROM app_sessions WHERE token_hash=?").bind(await digest(token)).run();
}

export function setSessionCookie(response: Response, token: string) {
  response.headers.set("Set-Cookie", cookieHeader(token));
  return response;
}

export function clearSessionCookie(response: Response) {
  response.headers.set("Set-Cookie", clearCookieHeader());
  return response;
}

export function sessionTokenFromRequest(request: Request) {
  const cookieHeaderValue = request.headers.get("cookie") ?? "";
  return cookieHeaderValue.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${SESSION_COOKIE}=`))?.split("=").slice(1).join("=");
}

export { DEFAULT_USERNAME };
