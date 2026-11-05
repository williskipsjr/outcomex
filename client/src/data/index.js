import * as files from "./files.js";
import * as mock from "./mock.js";
import * as polymarket from "./polymarket.js";
import * as sources from "./sources.js";

// The only door between the React app and the outside world. Components and
// hooks import from here and never call fetch themselves.
//
//   npm run dev          real Polymarket data
//   npm run dev:mock     fixtures from src/mocks (works offline; see .env.mock)
//
// The contract for everything exported here is docs/contracts/data.md.

const USE_MOCKS = import.meta.env?.VITE_USE_MOCKS === "true";

const real = { ...polymarket, ...files, ...sources };
const api = USE_MOCKS ? mock : real;

export const {
  listMarkets, // D1
  searchMarkets, // D2
  getMarket, // D3
  getHistory, // D4
  getPrediction, // D5
  listPractice, // D6
  getPractice, // D7
  revealPractice, // D8
  getStatuses, // D9
  checkSources, // D10
  getSparklines, // D11
} = api;

export { DataError, isDataError } from "./errors.js";
export { CATEGORIES, RANGES } from "./validate.js";
