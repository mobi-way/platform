import type { LocalPF } from '../types'

/**
 * 26 named locations in Passo Fundo, RS, Brazil.
 * Used for destination autocomplete in DestinationScreen.
 * Coordinates are WGS-84 (lat/lon).
 */
export const LOCAIS_PF: LocalPF[] = [
  // Shoppings e Mercados
  { nome: 'Passo Fundo Shopping',       lat: -28.2516, lon: -52.3686 },
  { nome: 'Bella Città Shopping',        lat: -28.2625, lon: -52.4080 },
  { nome: 'Bourbon Shopping',            lat: -28.2635, lon: -52.4095 },
  { nome: 'Stok Center Vergueiro',       lat: -28.2680, lon: -52.4050 },
  { nome: 'Stok Center Boqueirão',       lat: -28.2750, lon: -52.4200 },
  { nome: 'Havan',                       lat: -28.2500, lon: -52.3650 },

  // Transportes e Saúde
  { nome: 'Rodoviária de Passo Fundo',  lat: -28.2617, lon: -52.4172 },
  { nome: 'Hospital São Vicente (HSVP)', lat: -28.2600, lon: -52.4090 },
  { nome: 'Hospital da Cidade (HC)',     lat: -28.2570, lon: -52.4030 },
  { nome: 'Aeroporto Lauro Kortz',       lat: -28.2400, lon: -52.3300 },

  // Educação e Lazer
  { nome: 'UPF - Campus Central',        lat: -28.2325, lon: -52.3780 },
  { nome: 'IMED / Atitus Educação',      lat: -28.2750, lon: -52.4080 },
  { nome: 'IFSUL',                       lat: -28.2550, lon: -52.3900 },
  { nome: 'Parque da Gare',             lat: -28.2660, lon: -52.4150 },
  { nome: 'Catedral Nossa Senhora Aparecida', lat: -28.2626, lon: -52.4079 },
  { nome: 'Praça Tamandaré',            lat: -28.2590, lon: -52.4050 },
  { nome: 'Arena Gran Palazzo',          lat: -28.2250, lon: -52.3700 },

  // Ruas e Avenidas (Pontos de Referência Centrais)
  { nome: 'Av. Brasil Oeste (Centro)',                    lat: -28.2628, lon: -52.4087 },
  { nome: 'Av. Brasil Leste (Petrópolis)',                lat: -28.2550, lon: -52.3950 },
  { nome: 'Av. Presidente Vargas (São Cristóvão)',        lat: -28.2500, lon: -52.3800 },
  { nome: 'Av. Pátria',                                   lat: -28.2700, lon: -52.4100 },
  { nome: 'Rua Morom (Centro)',                           lat: -28.2635, lon: -52.4090 },
  { nome: 'Rua Bento Gonçalves',                          lat: -28.2610, lon: -52.4070 },
  { nome: 'Rua General Canabarro',                        lat: -28.2620, lon: -52.4100 },
  { nome: 'Rua Paissandu',                                lat: -28.2640, lon: -52.4080 },
  { nome: 'Rua Independência',                            lat: -28.2615, lon: -52.4060 },
]
