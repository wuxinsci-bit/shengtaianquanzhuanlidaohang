"use client";

import { Bot, ChevronDown, ChevronRight, MessageCircle, Plus, RotateCcw, Send, Sparkles, X } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { assistantKnowledge, assistantSuggestions, AssistantKnowledge } from "@/app/data/assistant-knowledge";
import { assistantExactQuestionMap, assistantQuestionBankCount, normalizeAssistantQuestion } from "@/app/data/assistant-question-bank";

type ChatMessage = { role: "assistant" | "user"; text: string; related?: string[] };

const welcomeMessage: ChatMessage = {
  role: "assistant",
  text: "你好，我是生态安全专利导航助手。你可以问我专利检索、13类技术分类、城市解析、地图操作、课程体系、虚拟仿真、创新创业或平台部署问题。",
  related: [],
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[\s，。！？、；：：“”‘’（）()【】[\]{}<>《》,.!?;:'"`]/g, "");
}

function findBestAnswer(question: string) {
  const query = normalize(question);
  if (!query) return { answer: "请先输入一个问题，我会根据生态安全专利导航知识库进行匹配。", related: assistantSuggestions };

  const exactIntentId = assistantExactQuestionMap.get(normalizeAssistantQuestion(question));
  if (exactIntentId) {
    const exactItem = assistantKnowledge.find((item) => item.id === exactIntentId);
    if (exactItem) return { answer: exactItem.answer, related: exactItem.related ?? assistantSuggestions.slice(0, 3) };
  }

  let best: { item: AssistantKnowledge; score: number } | null = null;
  for (const item of assistantKnowledge) {
    let score = 0;
    const title = normalize(item.title);
    if (query.includes(title) || title.includes(query)) score += 12;
    for (const keyword of item.keywords) {
      const normalized = normalize(keyword);
      if (normalized && query.includes(normalized)) score += Math.min(12, Math.max(3, normalized.length * 1.2));
    }
    if (score > 0 && (!best || score > best.score)) best = { item, score };
  }

  if (!best || best.score < 3) {
    return {
      answer: "这个问题暂时没有在我的领域知识库中找到足够匹配的答案。我可以优先回答：生态安全技术分类、森林草原火灾检索、专利数据来源、地级市解析、专利地图、课程体系、虚拟仿真、创新创业和平台部署。",
      related: assistantSuggestions,
    };
  }
  return { answer: best.item.answer, related: best.item.related ?? assistantSuggestions.slice(0, 3) };
}

export function EcoAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [typing, setTyping] = useState(false);
  const knowledgeCount = useMemo(() => assistantQuestionBankCount, []);

  function ask(question: string) {
    const trimmed = question.trim();
    if (!trimmed || typing) return;
    setInput("");
    setMessages((current) => [...current, { role: "user", text: trimmed }]);
    setTyping(true);
    window.setTimeout(() => {
      const result = findBestAnswer(trimmed);
      setMessages((current) => [...current, { role: "assistant", text: result.answer, related: result.related }]);
      setTyping(false);
    }, 220);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(input);
  }

  function reset() {
    setMessages([welcomeMessage]);
    setInput("");
  }

  return (
    <div className="eco-assistant" data-open={open}>
      {open && <section className="eco-assistant-panel" aria-label="生态安全智能助手">
        <header className="eco-assistant-head">
          <div className="eco-assistant-title"><span className="eco-assistant-avatar"><Bot size={17} /></span><div><strong>生态安全智能助手</strong><small><i /> 71 个标准意图 · 本地知识库</small></div></div>
          <span className="eco-assistant-count"><Sparkles size={11} /> {knowledgeCount.toLocaleString()} 问法</span>
          <div className="eco-assistant-head-actions"><button type="button" onClick={reset} aria-label="清空对话" title="清空对话"><RotateCcw size={15} /></button><button type="button" onClick={() => setOpen(false)} aria-label="关闭助手" title="关闭助手"><X size={17} /></button></div>
        </header>
        <div className="eco-assistant-toolbar"><button type="button" onClick={reset}><Plus size={14} /> 新对话</button><span><Sparkles size={12} /> 生态安全知识库 <ChevronDown size={12} /></span></div>
        {messages.length === 1 && <div className="eco-assistant-discovery"><div className="eco-assistant-discovery-mark"><Bot size={22} /></div><h3>你想从哪里开始？</h3><p>用自然语言提问，我会优先匹配经过整理的生态安全专利导航知识。</p><div className="eco-assistant-prompt-grid">{assistantSuggestions.map((suggestion) => <button type="button" key={suggestion} onClick={() => ask(suggestion)}><span>{suggestion}</span><ChevronRight size={13} /></button>)}</div></div>}
        <div className="eco-assistant-messages" aria-live="polite">
          {messages.map((message, index) => <div className={`eco-assistant-message eco-assistant-message--${message.role}`} key={`${message.role}-${index}`}><span className="eco-assistant-message-label">{message.role === "assistant" ? "助手" : "你"}</span><p>{message.text}</p>{message.role === "assistant" && message.related && <div className="eco-assistant-related">{message.related.slice(0, 4).map((related) => <button type="button" key={related} onClick={() => ask(related)}><ChevronRight size={12} />{related}</button>)}</div>}</div>)}
          {typing && <div className="eco-assistant-message eco-assistant-message--assistant"><span className="eco-assistant-message-label">助手</span><p className="eco-assistant-typing"><i /><i /><i /></p></div>}
        </div>
        <form className="eco-assistant-input" onSubmit={submit}><div className="eco-assistant-input-main"><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="输入问题，开始探索…" aria-label="输入问题" /><button type="submit" disabled={!input.trim() || typing} aria-label="发送问题"><Send size={16} /></button></div><div className="eco-assistant-input-meta"><span><Sparkles size={11} /> 生态安全模式</span><span>Enter 发送</span></div></form>
        <div className="eco-assistant-foot"><span><Sparkles size={12} /> 基于 {knowledgeCount.toLocaleString()} 条问题变体</span><span>复杂结论请结合原始来源核验</span></div>
      </section>}
      {!open && <div className="eco-assistant-hint">有问题？问问生态助手</div>}
      <button type="button" className="eco-assistant-fab" onClick={() => setOpen((current) => !current)} aria-label={open ? "关闭生态安全智能助手" : "打开生态安全智能助手"} aria-expanded={open} title="生态安全智能助手"><span className="eco-assistant-pulse" /><MessageCircle size={25} /></button>
    </div>
  );
}
