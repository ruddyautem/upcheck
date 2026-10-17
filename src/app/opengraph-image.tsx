import { ImageResponse } from 'next/og';

export const alt = 'Upcheck — dependency security and update inspector';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: 'center',
          background: '#050f17',
          color: '#ecf8f7',
          display: 'flex',
          height: '100%',
          justifyContent: 'center',
          padding: '72px',
          position: 'relative',
          width: '100%',
        }}
      >
        <div style={{ background: '#00cfa0', height: '100%', left: 0, position: 'absolute', top: 0, width: '18px' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%' }}>
          <div style={{ alignItems: 'center', display: 'flex', gap: '24px' }}>
            <div style={{ alignItems: 'center', background: '#00cfa0', color: '#052b32', display: 'flex', fontSize: '36px', fontWeight: 800, height: '88px', justifyContent: 'center', width: '88px' }}>UP</div>
            <div style={{ display: 'flex', fontSize: '64px', fontWeight: 800, letterSpacing: '-3px' }}>upcheck<span style={{ color: '#00cfa0' }}>.</span></div>
          </div>
          <div style={{ color: '#9fbdc1', display: 'flex', fontSize: '30px', lineHeight: 1.35, maxWidth: '900px' }}>Inspect dependency updates and known security advisories before they reach production.</div>
          <div style={{ color: '#00cfa0', display: 'flex', fontSize: '22px', letterSpacing: '3px', textTransform: 'uppercase' }}>GitHub / npm registry / OSV</div>
        </div>
      </div>
    ),
    size,
  );
}
