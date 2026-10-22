import { RouteTransition } from "@/components/motion/route-transition";

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <RouteTransition>{children}</RouteTransition>;
}
