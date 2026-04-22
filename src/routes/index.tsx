import { createFileRoute } from "@tanstack/react-router";
import IntelMeter from "@/components/IntelMeter";

export const Route = createFileRoute("/")({
  component: IntelMeter,
  head: () => ({
    meta: [
      { title: "Chargeup Intel Meter — Battery OEM Loss Calculator" },
      {
        name: "description",
        content:
          "See exactly how much your unmonitored EV battery fleet is bleeding every month. Live ROI calculator backed by Chargeup's verified IoT benchmarks: 50% lower service cost, 99.3% uptime, 5-min RCA.",
      },
      { property: "og:title", content: "Chargeup Intel Meter — Battery OEM Loss Calculator" },
      {
        property: "og:description",
        content:
          "Quantify the financial leakage from manual battery management vs Chargeup's intelligent IoT platform.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
});
