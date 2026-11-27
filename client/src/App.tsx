import { lazy, Suspense } from "react";
import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { queryClient } from "@/lib/api";
import { Layout } from "@/components/Layout";
import { useTheme } from "@/hooks/use-theme";
import Home from "@/pages/Home";

// Route-level code splitting keeps the first load small on court-side 4G.
const Bag = lazy(() => import("@/pages/Bag"));
const RacketDetail = lazy(() => import("@/pages/RacketDetail"));
const Setup = lazy(() => import("@/pages/Setup"));
const RecommendationPage = lazy(() => import("@/pages/RecommendationPage"));
const Feedback = lazy(() => import("@/pages/Feedback"));
const Stringers = lazy(() => import("@/pages/Stringers"));
const Rackets = lazy(() => import("@/pages/Rackets"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const PaymentSuccess = lazy(() => import("@/pages/PaymentSuccess"));
const Login = lazy(() => import("@/pages/Login"));
const Signup = lazy(() => import("@/pages/Signup"));
const Account = lazy(() => import("@/pages/Account"));
const Admin = lazy(() => import("@/pages/Admin"));
const About = lazy(() => import("@/pages/About"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));
// 10IS for Business
const Business = lazy(() => import("@/pages/business/Business"));
const HowWeRank = lazy(() => import("@/pages/business/HowWeRank"));
const Shops = lazy(() => import("@/pages/market/Shops"));
const ShopProfile = lazy(() => import("@/pages/market/ShopProfile"));
const Bookings = lazy(() => import("@/pages/market/Bookings"));
const StringDetail = lazy(() => import("@/pages/market/StringDetail"));
const BrandProfile = lazy(() => import("@/pages/market/BrandProfile"));
const ShopConsole = lazy(() => import("@/pages/shop/ShopConsole"));
const ShopNew = lazy(() => import("@/pages/shop/ShopNew"));
const BrandPortal = lazy(() => import("@/pages/brand/BrandPortal"));
const BrandNew = lazy(() => import("@/pages/brand/BrandNew"));
const NotFound = lazy(() => import("@/pages/not-found"));
// The chat (and its Markdown renderer) loads after the page, never blocking first paint.
const ChatBot = lazy(() => import("@/components/ChatBot").then((m) => ({ default: m.ChatBot })));

function PageFallback() {
  return (
    <div className="grid min-h-[50vh] place-items-center" aria-busy="true" aria-label="Loading">
      <span className="size-6 animate-ball-bounce rounded-full bg-ball shadow-[inset_-3px_-3px_0_rgb(0_0_0/0.12)]" />
    </div>
  );
}

function Router() {
  return (
    <Layout>
      <Suspense fallback={<PageFallback />}>
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/bag" component={Bag} />
          <Route path="/bag/:id" component={RacketDetail} />
          <Route path="/setup" component={Setup} />
          <Route path="/onboarding">
            <Redirect to="/setup" replace />
          </Route>
          <Route path="/recommendation/:runId" component={RecommendationPage} />
          <Route path="/feedback" component={Feedback} />
          <Route path="/stringers" component={Stringers} />
          <Route path="/rackets" component={Rackets} />
          <Route path="/pricing" component={Pricing} />
          <Route path="/payment-success" component={PaymentSuccess} />
          <Route path="/login" component={Login} />
          <Route path="/signup" component={Signup} />
          <Route path="/account" component={Account} />
          <Route path="/admin" component={Admin} />
          <Route path="/about" component={About} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/terms" component={Terms} />
          <Route path="/business" component={Business} />
          <Route path="/how-we-rank" component={HowWeRank} />
          <Route path="/shops" component={Shops} />
          <Route path="/shops/:slug" component={ShopProfile} />
          <Route path="/bookings" component={Bookings} />
          <Route path="/strings/:id" component={StringDetail} />
          <Route path="/brands/:slug" component={BrandProfile} />
          <Route path="/shop/new" component={ShopNew} />
          <Route path="/shop/:tab?" component={ShopConsole} />
          <Route path="/brand/new" component={BrandNew} />
          <Route path="/brand" component={BrandPortal} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </Layout>
  );
}

function ThemedToaster() {
  const { theme } = useTheme();
  return <Toaster theme={theme} position="top-center" richColors closeButton toastOptions={{ className: "font-sans" }} />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Suspense fallback={null}>
        <ChatBot />
      </Suspense>
      <ThemedToaster />
    </QueryClientProvider>
  );
}
