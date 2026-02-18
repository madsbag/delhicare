import { ImageResponse } from "next/og";
import { getSiteStats } from "@/lib/data";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const stats = getSiteStats();

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#1e40af",
          color: "white",
          fontFamily: "system-ui, sans-serif",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 700 }}>Karo Care</div>
        <div
          style={{
            fontSize: 28,
            opacity: 0.9,
            marginTop: "16px",
            maxWidth: "700px",
          }}
        >
          Find the Best Care Facilities in Delhi NCR
        </div>
        <div
          style={{
            display: "flex",
            gap: "48px",
            marginTop: "40px",
            fontSize: 20,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: 36, fontWeight: 700 }}>{stats.totalBusinesses}+</span>
            <span style={{ opacity: 0.8 }}>Facilities</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: 36, fontWeight: 700 }}>{stats.totalCities}</span>
            <span style={{ opacity: 0.8 }}>Cities</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <span style={{ fontSize: 36, fontWeight: 700 }}>4</span>
            <span style={{ opacity: 0.8 }}>Categories</span>
          </div>
        </div>
        <div style={{ marginTop: "32px", fontSize: 18, opacity: 0.7 }}>
          karocare.in
        </div>
      </div>
    ),
    size
  );
}
