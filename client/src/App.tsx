import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import BookingModal from "./components/BookingModal";
import { BookingModalProvider } from "./contexts/booking-modal";
import Home, { UnitDetail } from "./pages/Home";
import NotFound from "./pages/NotFound";
function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/unit/:id" component={UnitDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster position="top-right" />
        <BookingModalProvider>
          <Router />
          <BookingModal />
        </BookingModalProvider>
      </TooltipProvider>
    </ErrorBoundary>
  );
}
