# Mobi Way Platform

Plataforma de transporte urbano inteligente — monorepo com Turborepo.

## Apps

| App | Porta | Descrição |
|-----|-------|-----------|
| `apps/api` | 3001 | Backend Socket.io (relay de mensagens) |
| `apps/admin` | 5174 | Dashboard da frota (dono do ônibus) |
| `apps/passenger` | 5173 | App do passageiro (mobile-first) |
| `apps/driver` | 5175 | Interface do motorista (GPS + TTS) |

## Packages

| Package | Descrição |
|---------|-----------|
| `packages/shared` | Tipos, constantes e utilitários compartilhados |

## Stack

- **Frontend:** React + TypeScript + Vite + Leaflet + TailwindCSS
- **Backend:** Node.js + Express + Socket.io + TypeScript
- **Monorepo:** Turborepo + npm workspaces
- **Mapas:** OpenStreetMap + Leaflet.js
- **Roteamento:** OSRM (Open Source Routing Machine)
- **Dados de paradas:** Overpass API (OpenStreetMap)

## Como rodar

```bash
# Instalar dependências
npm install

# Rodar todos os apps em paralelo
npm run dev

# Ou individualmente:
npm run dev:api        # Backend (port 3001)
npm run dev:admin      # Dashboard frota (port 5174)
npm run dev:passenger  # App passageiro (port 5173)
npm run dev:driver     # App motorista (port 5175)
```

## Arquitetura de comunicação

```
Admin (frota) ──system_update──────────→ API ──→ Passenger + Driver
Passenger ──trip_options_request──────→ API ──→ Admin
Admin ──trip_options_response─────────→ API ──→ Passenger (targeted)
Passenger ──trip_request──────────────→ API ──→ Admin
```

## Localização base

Passo Fundo, Rio Grande do Sul, Brasil
Coordenadas: -28.25144, -52.39412
