import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'PulseFiles - Veilig bestanden delen';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          backgroundImage: 'radial-gradient(circle at 25% 25%, #1e3a5f 0%, transparent 50%), radial-gradient(circle at 75% 75%, #1e3a5f 0%, transparent 50%)',
        }}
      >
        {/* Logo/Icon */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 120,
            height: 120,
            borderRadius: 24,
            backgroundColor: '#3b82f6',
            marginBottom: 40,
          }}
        >
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            fontSize: 72,
            fontWeight: 700,
            color: 'white',
            marginBottom: 20,
            letterSpacing: '-0.02em',
          }}
        >
          PulseFiles
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: 'flex',
            fontSize: 32,
            color: '#94a3b8',
            marginBottom: 40,
            textAlign: 'center',
            maxWidth: 800,
          }}
        >
          Veilig bestanden delen tot 10GB
        </div>

        {/* Features */}
        <div
          style={{
            display: 'flex',
            gap: 40,
          }}
        >
          {['End-to-end encryptie', 'Geen account nodig', 'GDPR compliant'].map((feature) => (
            <div
              key={feature}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: '#3b82f6',
                fontSize: 20,
              }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              {feature}
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
