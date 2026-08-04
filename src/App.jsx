import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import RutaProtegida from "./components/RutaProtegida";
import Login from "./pages/Login";
import Registro from "./pages/Registro";
import Planes from "./pages/Planes";
import LicenciaResultado from "./pages/LicenciaResultado";
import RadioPublica from "./pages/RadioPublica";
import Dashboard from "./pages/Dashboard";
import Transmision from "./pages/Transmision";
import Mezclador from "./pages/Mezclador";
import Estadisticas from "./pages/Estadisticas";
import AutoDJ from "./pages/AutoDJ";
import Configuracion from "./pages/Configuracion";
import Superadmin from "./pages/Superadmin";

export default function App() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />
      <Route path="/radio" element={<RadioPublica />} />

      {/* Resultados de pago (accesibles sin auth para la redirección de MP) */}
      <Route path="/licencia/exito" element={<LicenciaResultado tipo="exito" />} />
      <Route path="/licencia/error" element={<LicenciaResultado tipo="error" />} />
      <Route path="/licencia/pendiente" element={<LicenciaResultado tipo="pendiente" />} />

      {/* Panel protegido */}
      <Route
        path="/"
        element={
          <RutaProtegida>
            <Layout />
          </RutaProtegida>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="transmision" element={<Transmision />} />
        <Route path="mezclador" element={null} />
        <Route path="estadisticas" element={<Estadisticas />} />
        <Route path="autodj" element={<AutoDJ />} />
        <Route path="configuracion" element={<Configuracion />} />
        <Route path="planes" element={<Planes />} />
        <Route path="admin" element={<Superadmin />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
