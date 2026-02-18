import { ImageResponse } from "next/og";
import { getBusinessBySlug } from "@/lib/data";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const business = getBusinessBySlug(slug);

  if (!business) {
    return new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            backgroundColor: "#1e40af",
            color: "white",
            fontSize: 48,
            fontWeight: 700,
          }}
        >
          Karo Care
        </div>
      ),
      size
    );
  }

  const ratingText = business.rating
    ? `★ ${business.rating.toFixed(1)}/5`
    : "";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "white",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Blue header bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "24px 48px",
            backgroundColor: "#1e40af",
            color: "white",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                fontSize: 28,
                fontWeight: 700,
              }}
            >
              Karo Care
            </div>
          </div>
          <div style={{ fontSize: 18, opacity: 0.9 }}>karocare.in</div>
        </div>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            padding: "48px",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 20,
              color: "#2563eb",
              fontWeight: 600,
              marginBottom: "12px",
            }}
          >
            {business.category}
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 700,
              color: "#111827",
              lineHeight: 1.2,
              maxWidth: "900px",
            }}
          >
            {business.name}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "24px",
              marginTop: "24px",
              fontSize: 22,
              color: "#6b7280",
            }}
          >
            <span>📍 {business.city}, {business.state}</span>
            {ratingText && (
              <span style={{ color: "#d97706", fontWeight: 600 }}>
                {ratingText}
              </span>
            )}
          </div>
          {business.services && business.services.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                marginTop: "24px",
              }}
            >
              {business.services.slice(0, 4).map((s) => (
                <span
                  key={s.name}
                  style={{
                    padding: "6px 16px",
                    borderRadius: "20px",
                    backgroundColor: "#eff6ff",
                    color: "#1e40af",
                    fontSize: 16,
                    fontWeight: 500,
                  }}
                >
                  {s.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    ),
    size
  );
}
