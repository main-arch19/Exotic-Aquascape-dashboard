'use client';

// Imported here rather than in globals.css so workers who never open a map
// don't download map CSS.
import 'leaflet/dist/leaflet.css';

import { Fragment, useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import type { Ping } from '@/lib/tracking/types';

// Kept in an env var from day one so swapping to a paid provider is a config
// change, not a code change. See the OSM tile usage policy: it targets
// low-volume non-commercial use and wants an identifying User-Agent that a
// browser cannot set, so a permanent wall display needs a real provider.
const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ??
  'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

// Attribution is a licence condition, not a formality.
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const TRACK_COLORS = [
  'oklch(0.50 0.15 200)',
  'oklch(0.65 0.14 40)',
  'oklch(0.55 0.14 280)',
  'oklch(0.60 0.14 220)',
  'oklch(0.55 0.15 190)',
];

export function colorForIndex(i: number) {
  return TRACK_COLORS[i % TRACK_COLORS.length];
}

/**
 * L.divIcon rather than L.Icon.Default: the default icon's image URLs break
 * under every bundler, and the usual `delete L.Icon.Default.prototype._getIconUrl`
 * monkey-patch is fragile. Inline HTML sidesteps the asset problem entirely and
 * lets each worker carry a distinct colour.
 */
function workerIcon(color: string, live: boolean) {
  return L.divIcon({
    className: '',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    html: `<span style="
      display:block;width:18px;height:18px;border-radius:9999px;
      background:${color};border:3px solid white;
      box-shadow:0 0 0 1px rgba(0,0,0,.25)${live ? `,0 0 0 6px ${color}33` : ''};
    "></span>`,
  });
}

/**
 * Leaflet computes a 0x0 viewport when it mounts inside a hidden or collapsed
 * container and then stays grey forever. Recomputing on mount and on
 * visibilitychange is the cheap insurance.
 */
function SizeFixer() {
  const map = useMap();
  useEffect(() => {
    const fix = () => map.invalidateSize();
    const t = setTimeout(fix, 0);
    document.addEventListener('visibilitychange', fix);
    window.addEventListener('resize', fix);
    return () => {
      clearTimeout(t);
      document.removeEventListener('visibilitychange', fix);
      window.removeEventListener('resize', fix);
    };
  }, [map]);
  return null;
}

function FocusOn({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 14), { duration: 0.8 });
  }, [map, target]);
  return null;
}

export interface MapTrack {
  id: string;
  label: string;
  sublabel?: string;
  pings: Ping[];
}

interface TrackingMapProps {
  tracks: MapTrack[];
  focus?: [number, number] | null;
  /** Renders the head marker only for the last point (replay mode). */
  showMarkers?: boolean;
  className?: string;
}

export default function TrackingMap({
  tracks,
  focus = null,
  showMarkers = true,
  className,
}: TrackingMapProps) {
  const center = useMemo<[number, number]>(() => {
    // Written without an early return so the React Compiler can preserve the
    // memo — it bails out on control flow it can't prove is pure.
    const withFix = tracks.find((t) => t.pings.length > 0);
    const last = withFix?.pings[withFix.pings.length - 1];
    return last
      ? [last.lat, last.lng]
      : [25.7617, -80.1918]; // Miami, a sane default for this business
  }, [tracks]);

  return (
    // MapContainer renders 0px tall without an explicit height — the classic
    // silent failure.
    <div className={className ?? 'h-[520px] w-full overflow-hidden rounded-xl border border-border'}>
      <MapContainer
        center={center}
        zoom={12}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer url={TILE_URL} attribution={ATTRIBUTION} />
        <SizeFixer />
        <FocusOn target={focus} />

        {tracks.map((track, i) => {
          const color = colorForIndex(i);
          const positions = track.pings.map((p) => [p.lat, p.lng] as [number, number]);
          const head = track.pings[track.pings.length - 1];

          return (
            // Fragment, not a div: react-leaflet layers attach through context
            // and render null, so a wrapper element would sit as a stray DOM
            // node on top of the map.
            <Fragment key={track.id}>
              {positions.length > 1 && (
                <Polyline
                  positions={positions}
                  pathOptions={{ color, weight: 4, opacity: 0.85 }}
                />
              )}
              {showMarkers && head && (
                <Marker position={[head.lat, head.lng]} icon={workerIcon(color, true)}>
                  <Popup>
                    <span className="font-semibold">{track.label}</span>
                    {track.sublabel && (
                      <>
                        <br />
                        {track.sublabel}
                      </>
                    )}
                  </Popup>
                </Marker>
              )}
            </Fragment>
          );
        })}
      </MapContainer>
    </div>
  );
}
