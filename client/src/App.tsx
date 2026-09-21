import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import Home, { UnitDetail } from "./pages/Home";
import MediaAdmin from "./pages/MediaAdmin";
function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/unit/:id" component={UnitDetail} />
      <Route path="/admin" component={MediaAdmin} />
      <Route path="/admin/media" component={MediaAdmin} />
      <Route component={Home} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster position="top-right" />
        <Router />
      </TooltipProvider>
    </ErrorBoundary>
  );
}
