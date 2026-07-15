import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import RutaProtegida from "./components/RutaProtegida";
import Login from "./pages/Login";
import RadioPublica from "./pages/RadioPublica";
import Dashboard from "./pages/Dashboard";
import Transmision from "./pages/Transmision";
import Estadisticas from "./pages/Estadisticas";
import AutoDJ from "./pages/AutoDJ";
import Configuracion from "./pages/Configuracion";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/radio" element={<RadioPublica />} />
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
        <Route path="estadisticas" element={<Estadisticas />} />
        <Route path="autodj" element={<AutoDJ />} />
        <Route path="configuracion" element={<Configuracion />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
