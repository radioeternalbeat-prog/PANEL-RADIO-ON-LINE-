import { Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import RutaProtegida from "./components/RutaProtegida";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Estadisticas from "./pages/Estadisticas";
import AutoDJ from "./pages/AutoDJ";
import Configuracion from "./pages/Configuracion";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <RutaProtegida>
            <Layout />
          </RutaProtegida>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="estadisticas" element={<Estadisticas />} />
        <Route path="autodj" element={<AutoDJ />} />
        <Route path="configuracion" element={<Configuracion />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
