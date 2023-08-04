import Link from "next/link";

export default function Examples() {
  return (
    <div>
      <div>Examples</div>
      <div
        style={{
          marginTop: "8px",
          display: "flex",
          flexDirection: "column",
          rowGap: "8px",
        }}
      >
        <Link href="/playground/oauth">OAuth</Link>
        <Link href="/playground/manifest">Manifest</Link>
      </div>
    </div>
  );
}
