import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Layout } from "@/components/Layout";
import { UserProvider } from "@/contexts/UserContext";

import Home from "@/pages/Home";
import Onboarding from "@/pages/Onboarding";
import RecommendationPage from "@/pages/RecommendationPage";
import Feedback from "@/pages/Feedback";
import Stringers from "@/pages/Stringers";
import Rackets from "@/pages/Rackets";
import Pricing from "@/pages/Pricing";
import PaymentSuccess from "@/pages/PaymentSuccess";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/recommendation/:runId" component={RecommendationPage} />
        <Route path="/feedback" component={Feedback} />
        <Route path="/stringers" component={Stringers} />
        <Route path="/rackets" component={Rackets} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/payment-success" component={PaymentSuccess} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </UserProvider>
    </QueryClientProvider>
  );
}
