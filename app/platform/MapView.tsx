"use client";

import { useEffect, useRef, useState } from "react";
import type { LayerGroup, Map as LeafletMap } from "leaflet";
import type { PatentRecord } from "@/app/lib/patents";
import { domainById } from "@/app/lib/patents";

export function MapView({ patents, selectedId, onSelect }: { patents: PatentRecord[]; selectedId: number | null; onSelect: (patent: PatentRecord) => void }) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!nodeRef.current || mapRef.current) return;
    let cancelled = false;
    void import("leaflet").then((L) => {
      if (cancelled || !nodeRef.current) return;
      const map = L.map(nodeRef.current, { zoomControl: false, minZoom: 3, maxZoom: 12 }).setView([35.5, 104.2], 4);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      setReady(true);
    });
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;
    void import("leaflet").then((L) => {
      layer.clearLayers();
      const geocoded = patents.filter((item) => item.latitude !== null && item.longitude !== null);
      const grouped = new Map<string, PatentRecord[]>();
      geocoded.forEach((item) => grouped.set(item.city, [...(grouped.get(item.city) ?? []), item]));

      grouped.forEach((items) => {
        const representative = items.find((item) => item.id === selectedId) ?? items[0];
        const active = items.some((item) => item.id === selectedId);
        const domain = domainById(representative.ecoDomain);
        const marker = L.circleMarker([representative.latitude!, representative.longitude!], {
          radius: Math.min(9 + items.length * 2.2, 24), color: active ? "#10231c" : "#ffffff",
          weight: active ? 4 : 2, fillColor: domain.color, fillOpacity: .9,
        }).addTo(layer);
        marker.bindTooltip(`<strong>${representative.city}</strong><br>${items.length} 件专利`, { direction: "top", offset: [0, -8] });
        marker.on("click", () => onSelect(representative));
      });

      if (selectedId) {
        const selected = geocoded.find((item) => item.id === selectedId);
        if (selected) map.flyTo([selected.latitude!, selected.longitude!], Math.max(map.getZoom(), 7), { duration: .6 });
      } else if (geocoded.length > 1) {
        const bounds = L.latLngBounds(geocoded.map((item) => [item.latitude!, item.longitude!] as [number, number]));
        map.fitBounds(bounds, { padding: [42, 42], maxZoom: 6 });
      }
    });
  }, [patents, selectedId, onSelect, ready]);

  return <div className="patent-map" ref={nodeRef} aria-label="专利所在地地图；点击圆点查看城市专利属性" />;
}
