import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { flushAnalyticsQueue, installAnalyticsLifecycle } from "../../services/analyticsService";

export function AnalyticsBootstrap() {
  const location = useLocation();

  useEffect(() => {
    installAnalyticsLifecycle();
    void flushAnalyticsQueue();
  }, []);

  useEffect(() => {
    void flushAnalyticsQueue();
  }, [location.pathname]);

  return null;
}
