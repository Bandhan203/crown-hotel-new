import { BrowserRouter, Routes, Route } from "react-router";
import { Toaster } from "sonner";
import { HotelProvider } from "./contexts/HotelContext";
import { RoomsProvider } from "./contexts/RoomsContext";
import { GuestProvider } from "./contexts/GuestContext";
import {
  ThemeProvider,
  useTheme,
} from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { Layout } from "./components/Layout";
import { StatsBar } from "./components/dashboard/StatsBar";
import { RoomGrid } from "./components/dashboard/RoomGrid";
import { GuestList } from "./components/guests/GuestList";
import { ReservationList } from "./components/reservations/ReservationList";
import { CheckinWizard } from "./components/checkin/CheckinWizard";
import { ServiceEntry } from "./components/billing/ServiceEntry";
import { NightAudit } from "./components/audit/NightAudit";
import { Reports } from "./components/reports/Reports";
import { Inventory } from "./components/inventory/Inventory";
import { Settings } from "./components/settings/Settings";
import { Housekeeping } from "./components/housekeeping/Housekeeping";
import { CorporateCRM } from "./components/corporate/CorporateCRM";
import { CommissionPage } from "./components/corporate/CommissionPage";

function Dashboard() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <StatsBar />
      <div
        style={{ flex: 1, overflow: "hidden", display: "flex" }}
      >
        <RoomGrid />
      </div>
    </div>
  );
}

function AppInner() {
  const { theme } = useTheme();
  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route
            path="/reservations"
            element={<ReservationList />}
          />
          <Route path="/guests" element={<GuestList />} />
          <Route path="/checkin" element={<CheckinWizard />} />
          <Route
            path="/service-entry"
            element={<ServiceEntry />}
          />
          <Route path="/night-audit" element={<NightAudit />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route
            path="/housekeeping"
            element={<Housekeeping />}
          />
          <Route path="/corporate" element={<CorporateCRM />} />
          <Route
            path="/commissions"
            element={<CommissionPage />}
          />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
      <Toaster
        theme={theme as "dark" | "light"}
        position="top-right"
        richColors
        toastOptions={{
          style: {
            fontFamily: "system-ui, sans-serif",
            fontSize: 13,
          },
        }}
      />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <HotelProvider>
            <RoomsProvider>
              <GuestProvider>
                <AppInner />
              </GuestProvider>
            </RoomsProvider>
          </HotelProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}