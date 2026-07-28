import { useEffect, useRef } from 'react';

// Sky-obstruction rendered as a tilted radar dome (zenith at center, horizon at
// the rim): clear sky = blue by SNR, blocked = red. Reads like a 3D dome.
export default function ObstructionMap({ data }) {
  const ref = useRef(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || !data?.snr?.length) return;
    const C = data.num_cols, Rn = data.num_rows, snr = data.snr, size = 220;
    cv.width = size; cv.height = size;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, size, size);
    const cx = size / 2, cy = size / 2, rad = size / 2 - 3;
    const cw = size / C, ch = size / Rn;
    for (let r = 0; r < Rn; r++) {
      for (let c = 0; c < C; c++) {
        const v = snr[r * C + c];
        if (v < 0) continue;
        const x = c * cw, y = r * ch;
        if (Math.hypot(x + cw / 2 - cx, y + ch / 2 - cy) > rad) continue;
        ctx.fillStyle = v < 0.25 ? 'rgba(223,88,87,0.92)' : `rgba(78,161,255,${0.12 + v * 0.5})`;
        ctx.fillRect(x, y, cw + 1, ch + 1);
      }
    }
    // radar grid
    ctx.strokeStyle = 'rgba(154,166,178,0.22)'; ctx.lineWidth = 1;
    [0.34, 0.67, 1].forEach((f) => { ctx.beginPath(); ctx.arc(cx, cy, rad * f, 0, Math.PI * 2); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(cx - rad, cy); ctx.lineTo(cx + rad, cy); ctx.moveTo(cx, cy - rad); ctx.lineTo(cx, cy + rad); ctx.stroke();
  }, [data]);

  return (
    <div className="flex items-center justify-center py-3" style={{ perspective: '640px' }}>
      <div className="relative" style={{ transform: 'rotateX(54deg)' }}>
        <div className="absolute rounded-full" style={{ inset: '-18%', background: 'radial-gradient(circle, rgba(78,161,255,0.20), transparent 70%)' }} />
        <canvas ref={ref} className="relative block rounded-full" style={{ width: 200, height: 200, boxShadow: '0 0 34px rgba(78,161,255,0.22)' }} />
      </div>
    </div>
  );
}
