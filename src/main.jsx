import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { ThemeProvider } from "./context/ThemeContext.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { OnAirProvider } from "./context/OnAirContext.jsx";
import { PlayerProvider } from "./context/PlayerContext.jsx";
import { MidiProvider } from "./context/MidiContext.jsx";
import { AutomatizacionProvider } from "./context/AutomatizacionContext.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          {/* MidiProvider depende de useAuth (perfiles por usuario), por eso
              va dentro de AuthProvider y envuelve el resto de la app.
              AutomatizacionProvider depende de useAuth/usePlayer/useOnAir,
              por eso va anidado dentro de los tres. */}
          <MidiProvider>
            <OnAirProvider>
              <PlayerProvider>
                <AutomatizacionProvider>
                  <App />
                </AutomatizacionProvider>
              </PlayerProvider>
            </OnAirProvider>
          </MidiProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
