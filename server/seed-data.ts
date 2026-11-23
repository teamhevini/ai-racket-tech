// Racket catalog. Seeding upserts by brand + model, so editing this list never
// wipes ids that saved history points at (v1 deleted and reinserted the whole table).
import type { InsertRacket } from "@shared/schema";

export const RACKET_CATALOG: InsertRacket[] = [
    // ── HEVINI (featured) ──
    { brand: "Hevini", model: "Solution 1", headSize: 97, stringPattern: "16x19", weightUnstrung: 300, balance: "7 pts HL", stiffnessRa: 68, beamWidth: "21mm", recTensionMin: 48, recTensionMax: 55, sourceUrl: "https://hevinisporting.com", level: "advanced" },

    // ── WILSON ──
    // Defyer line (2026) – featured
    { brand: "Wilson", model: "Defyer 98", headSize: 98, stringPattern: "16x20", weightUnstrung: 305, balance: "6 pts HL", stiffnessRa: 63, beamWidth: "22/23.5/22mm", recTensionMin: 48, recTensionMax: 58, level: "advanced", year: 2026 },
    { brand: "Wilson", model: "Defyer 98 Pro", headSize: 98, stringPattern: "16x20", weightUnstrung: 305, balance: "7 pts HL", stiffnessRa: 64, beamWidth: "22/23.5/22mm", recTensionMin: 48, recTensionMax: 58, level: "pro", year: 2026 },
    { brand: "Wilson", model: "Defyer 100", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "6 pts HL", stiffnessRa: 66, beamWidth: "23.75/25/23mm", recTensionMin: 50, recTensionMax: 60, level: "intermediate", year: 2026 },
    { brand: "Wilson", model: "Blade 98 16x19 v9", headSize: 98, stringPattern: "16x19", weightUnstrung: 305, balance: "5 pts HL", stiffnessRa: 62, beamWidth: "21mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Wilson", model: "Blade 98 18x20 v9", headSize: 98, stringPattern: "18x20", weightUnstrung: 310, balance: "5 pts HL", stiffnessRa: 62, beamWidth: "21mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Wilson", model: "Blade 100 v9", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 62, beamWidth: "23mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Wilson", model: "Blade 104 v9", headSize: 104, stringPattern: "16x19", weightUnstrung: 290, balance: "4 pts HL", stiffnessRa: 60, beamWidth: "23mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Wilson", model: "Clash 100 v2", headSize: 100, stringPattern: "16x19", weightUnstrung: 295, balance: "5 pts HL", stiffnessRa: 55, beamWidth: "24.5mm", recTensionMin: 48, recTensionMax: 58 },
    { brand: "Wilson", model: "Clash 98 v2", headSize: 98, stringPattern: "16x19", weightUnstrung: 305, balance: "5 pts HL", stiffnessRa: 55, beamWidth: "24mm", recTensionMin: 48, recTensionMax: 58 },
    { brand: "Wilson", model: "Pro Staff 97 v14", headSize: 97, stringPattern: "16x19", weightUnstrung: 315, balance: "7 pts HL", stiffnessRa: 63, beamWidth: "21.5mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Wilson", model: "Pro Staff 97L v14", headSize: 97, stringPattern: "16x19", weightUnstrung: 290, balance: "4 pts HL", stiffnessRa: 63, beamWidth: "21.5mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Wilson", model: "Ultra 100 v4", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 68, beamWidth: "25mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Wilson", model: "Shift 99 v1", headSize: 99, stringPattern: "16x20", weightUnstrung: 300, balance: "5 pts HL", stiffnessRa: 59, beamWidth: "22mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Wilson", model: "Burn 100 v5", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 68, beamWidth: "27mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Wilson", model: "Blade 98 v8 16x19", headSize: 98, stringPattern: "16x19", weightUnstrung: 305, balance: "8 pts HL", stiffnessRa: 62, beamWidth: "21mm", recTensionMin: 50, recTensionMax: 60, level: "advanced" },
    { brand: "Wilson", model: "Blade 98 v8 18x20", headSize: 98, stringPattern: "18x20", weightUnstrung: 305, balance: "8 pts HL", stiffnessRa: 62, beamWidth: "21mm", recTensionMin: 50, recTensionMax: 60, level: "advanced" },
    { brand: "Wilson", model: "Blade 100 v8", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "6 pts HL", stiffnessRa: 62, beamWidth: "21mm", recTensionMin: 50, recTensionMax: 60, level: "intermediate" },
    { brand: "Wilson", model: "Blade 104 v8", headSize: 104, stringPattern: "16x19", weightUnstrung: 290, balance: "4 pts HL", stiffnessRa: 62, beamWidth: "21mm", recTensionMin: 48, recTensionMax: 58, level: "intermediate" },
    { brand: "Wilson", model: "Clash 100 Pro v2", headSize: 100, stringPattern: "16x19", weightUnstrung: 310, balance: "6 pts HL", stiffnessRa: 55, beamWidth: "24.5mm", recTensionMin: 50, recTensionMax: 60, level: "advanced" },
    { brand: "Wilson", model: "Clash 100L v2", headSize: 100, stringPattern: "16x19", weightUnstrung: 280, balance: "2 pts HL", stiffnessRa: 55, beamWidth: "24.5mm", recTensionMin: 48, recTensionMax: 58, level: "beginner" },
    { brand: "Wilson", model: "Ultra 100L v4", headSize: 100, stringPattern: "16x19", weightUnstrung: 277, balance: "2 pts HL", stiffnessRa: 68, beamWidth: "26mm", recTensionMin: 48, recTensionMax: 58, level: "beginner" },
    { brand: "Wilson", model: "Pro Staff 85 v14", headSize: 85, stringPattern: "16x19", weightUnstrung: 340, balance: "9 pts HL", stiffnessRa: 65, beamWidth: "20mm", recTensionMin: 50, recTensionMax: 62, level: "pro" },
    { brand: "Wilson", model: "Shift 99L v1", headSize: 99, stringPattern: "16x19", weightUnstrung: 280, balance: "2 pts HL", stiffnessRa: 61, beamWidth: "21mm", recTensionMin: 46, recTensionMax: 56, level: "intermediate" },

    // ── BABOLAT ──
    // Gen 11 Pure Drive (2025) — Woofer 2.0, RA lowered from 71 to 68
    { brand: "Babolat", model: "Pure Drive Gen 11 2025", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 68, beamWidth: "23/26/23mm", recTensionMin: 50, recTensionMax: 59, year: 2025 },
    // Pure Aero 2026 (Gen 9)
    { brand: "Babolat", model: "Pure Aero 2026", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 66, beamWidth: "23/26/23mm", recTensionMin: 50, recTensionMax: 59, year: 2026 },
    { brand: "Babolat", model: "Pure Aero 98 2026", headSize: 98, stringPattern: "16x20", weightUnstrung: 305, balance: "6 pts HL", stiffnessRa: 65, beamWidth: "21/23/22mm", recTensionMin: 50, recTensionMax: 59, year: 2026 },
    { brand: "Babolat", model: "Pure Aero 98 2023", headSize: 98, stringPattern: "16x20", weightUnstrung: 305, balance: "6 pts HL", stiffnessRa: 66, beamWidth: "21/23/22mm", recTensionMin: 50, recTensionMax: 59 },
    { brand: "Babolat", model: "Pure Aero 100 2023", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "6 pts HL", stiffnessRa: 69, beamWidth: "23/26/23mm", recTensionMin: 50, recTensionMax: 59 },
    { brand: "Babolat", model: "Pure Aero Rafa 2023", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "5 pts HL", stiffnessRa: 70, beamWidth: "23/26/23mm", recTensionMin: 50, recTensionMax: 59 },
    { brand: "Babolat", model: "Pure Aero Plus 2023", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "6 pts HL", stiffnessRa: 69, beamWidth: "23/26/23mm", recTensionMin: 50, recTensionMax: 59 },
    { brand: "Babolat", model: "Pure Drive 2021", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 71, beamWidth: "23/26/23mm", recTensionMin: 50, recTensionMax: 59 },
    { brand: "Babolat", model: "Pure Drive 98 2025", headSize: 98, stringPattern: "16x20", weightUnstrung: 305, balance: "5 pts HL", stiffnessRa: 72, beamWidth: "21/23/21mm", recTensionMin: 50, recTensionMax: 59 },
    { brand: "Babolat", model: "Pure Drive Tour 2021", headSize: 100, stringPattern: "16x19", weightUnstrung: 315, balance: "4 pts HL", stiffnessRa: 71, beamWidth: "23/26/23mm", recTensionMin: 50, recTensionMax: 59 },
    { brand: "Babolat", model: "Pure Strike 97 v4", headSize: 97, stringPattern: "18x20", weightUnstrung: 305, balance: "5 pts HL", stiffnessRa: 68, beamWidth: "21mm", recTensionMin: 50, recTensionMax: 59 },
    { brand: "Babolat", model: "Pure Strike 100 v4", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 67, beamWidth: "23mm", recTensionMin: 50, recTensionMax: 59 },
    { brand: "Babolat", model: "Pure Strike VS 2022", headSize: 99, stringPattern: "18x20", weightUnstrung: 305, balance: "5 pts HL", stiffnessRa: 62, beamWidth: "21mm", recTensionMin: 50, recTensionMax: 59 },
    { brand: "Babolat", model: "Pure Aero 2023", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 71, beamWidth: "23-26mm", recTensionMin: 55, recTensionMax: 62, level: "intermediate" },
    { brand: "Babolat", model: "Pure Aero Team 2023", headSize: 100, stringPattern: "16x19", weightUnstrung: 285, balance: "2 pts HL", stiffnessRa: 69, beamWidth: "23-26mm", recTensionMin: 52, recTensionMax: 60, level: "beginner" },
    { brand: "Babolat", model: "Pure Aero Lite 2023", headSize: 100, stringPattern: "16x19", weightUnstrung: 270, balance: "0 pts HL", stiffnessRa: 69, beamWidth: "23-26mm", recTensionMin: 50, recTensionMax: 58, level: "beginner" },
    { brand: "Babolat", model: "Pure Drive Plus 2021", headSize: 100, stringPattern: "16x19", weightUnstrung: 295, balance: "4 pts HL", stiffnessRa: 72, beamWidth: "23-26mm", recTensionMin: 55, recTensionMax: 62, level: "intermediate" },
    { brand: "Babolat", model: "Pure Drive Team 2021", headSize: 100, stringPattern: "16x19", weightUnstrung: 285, balance: "2 pts HL", stiffnessRa: 70, beamWidth: "23-26mm", recTensionMin: 52, recTensionMax: 60, level: "beginner" },
    { brand: "Babolat", model: "Pure Drive Lite 2021", headSize: 100, stringPattern: "16x19", weightUnstrung: 270, balance: "0 pts HL", stiffnessRa: 70, beamWidth: "23-26mm", recTensionMin: 50, recTensionMax: 58, level: "beginner" },
    { brand: "Babolat", model: "Pure Strike Team v4", headSize: 100, stringPattern: "16x19", weightUnstrung: 285, balance: "4 pts HL", stiffnessRa: 67, beamWidth: "21-24mm", recTensionMin: 48, recTensionMax: 57, level: "intermediate" },

    // ── HEAD ──
    // 2026 Speed generation (Hy-Bor tech)
    { brand: "Head", model: "Speed MP 2026", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 60, beamWidth: "23mm", recTensionMin: 48, recTensionMax: 57, year: 2026 },
    { brand: "Head", model: "Speed Pro 2026", headSize: 100, stringPattern: "18x20", weightUnstrung: 310, balance: "7 pts HL", stiffnessRa: 61, beamWidth: "23mm", recTensionMin: 48, recTensionMax: 57, level: "advanced", year: 2026 },
    { brand: "Head", model: "Speed MP L 2026", headSize: 100, stringPattern: "16x19", weightUnstrung: 280, balance: "2 pts HL", stiffnessRa: 60, beamWidth: "23mm", recTensionMin: 46, recTensionMax: 55, level: "intermediate", year: 2026 },
    { brand: "Head", model: "Extreme MP 2026", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 67, beamWidth: "21/26/21mm", recTensionMin: 48, recTensionMax: 57, year: 2026 },
    { brand: "Head", model: "Boom MP 2026", headSize: 100, stringPattern: "16x19", weightUnstrung: 295, balance: "3 pts HL", stiffnessRa: 66, beamWidth: "25mm", recTensionMin: 50, recTensionMax: 59, year: 2026 },
    { brand: "Head", model: "Speed MP 2024", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 60, beamWidth: "23mm", recTensionMin: 48, recTensionMax: 57 },
    { brand: "Head", model: "Speed Pro 2024", headSize: 100, stringPattern: "18x20", weightUnstrung: 310, balance: "5 pts HL", stiffnessRa: 60, beamWidth: "23mm", recTensionMin: 48, recTensionMax: 57 },
    { brand: "Head", model: "Speed Pro Legend 2024", headSize: 100, stringPattern: "18x20", weightUnstrung: 310, balance: "5 pts HL", stiffnessRa: 60, beamWidth: "23mm", recTensionMin: 48, recTensionMax: 57 },
    { brand: "Head", model: "Speed MP L 2024", headSize: 100, stringPattern: "16x19", weightUnstrung: 280, balance: "2 pts HL", stiffnessRa: 60, beamWidth: "23mm", recTensionMin: 46, recTensionMax: 55 },
    { brand: "Head", model: "Radical MP 2023", headSize: 98, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 64, beamWidth: "22mm", recTensionMin: 48, recTensionMax: 57 },
    { brand: "Head", model: "Radical Pro 2023", headSize: 98, stringPattern: "18x19", weightUnstrung: 310, balance: "5 pts HL", stiffnessRa: 66, beamWidth: "22mm", recTensionMin: 48, recTensionMax: 57 },
    { brand: "Head", model: "Gravity MP 2023", headSize: 100, stringPattern: "16x20", weightUnstrung: 295, balance: "3 pts HL", stiffnessRa: 59, beamWidth: "21/23/22mm", recTensionMin: 48, recTensionMax: 57 },
    { brand: "Head", model: "Gravity Pro 2024", headSize: 100, stringPattern: "18x20", weightUnstrung: 315, balance: "5 pts HL", stiffnessRa: 58, beamWidth: "21/23/22mm", recTensionMin: 48, recTensionMax: 57 },
    { brand: "Head", model: "Gravity Pro 2025", headSize: 100, stringPattern: "18x20", weightUnstrung: 315, balance: "5 pts HL", stiffnessRa: 57, beamWidth: "21/23/22mm", recTensionMin: 48, recTensionMax: 57 },
    { brand: "Head", model: "Extreme MP 2022", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "2 pts HL", stiffnessRa: 70, beamWidth: "25mm", recTensionMin: 52, recTensionMax: 62 },
    { brand: "Head", model: "Extreme MP L 2024", headSize: 100, stringPattern: "16x19", weightUnstrung: 285, balance: "2 pts HL", stiffnessRa: 68, beamWidth: "25mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Head", model: "Boom MP 2024", headSize: 100, stringPattern: "16x19", weightUnstrung: 295, balance: "3 pts HL", stiffnessRa: 66, beamWidth: "25mm", recTensionMin: 50, recTensionMax: 59 },
    { brand: "Head", model: "Boom Pro 2024", headSize: 100, stringPattern: "18x20", weightUnstrung: 305, balance: "4 pts HL", stiffnessRa: 67, beamWidth: "25mm", recTensionMin: 50, recTensionMax: 59 },
    { brand: "Head", model: "Prestige MP 2023", headSize: 99, stringPattern: "18x19", weightUnstrung: 310, balance: "6 pts HL", stiffnessRa: 63, beamWidth: "21mm", recTensionMin: 48, recTensionMax: 57 },
    { brand: "Head", model: "Prestige Pro 2023", headSize: 99, stringPattern: "18x20", weightUnstrung: 320, balance: "7 pts HL", stiffnessRa: 63, beamWidth: "21mm", recTensionMin: 48, recTensionMax: 57 },
    { brand: "Head", model: "Prestige Tour 2023", headSize: 99, stringPattern: "18x20", weightUnstrung: 335, balance: "9 pts HL", stiffnessRa: 63, beamWidth: "21mm", recTensionMin: 50, recTensionMax: 58 },
    { brand: "Head", model: "Speed S 2024", headSize: 105, stringPattern: "16x19", weightUnstrung: 285, balance: "2 pts HL", stiffnessRa: 65, beamWidth: "23mm", recTensionMin: 50, recTensionMax: 60, level: "beginner" },
    { brand: "Head", model: "Gravity Pro 2023", headSize: 100, stringPattern: "16x20", weightUnstrung: 315, balance: "6 pts HL", stiffnessRa: 59, beamWidth: "23mm", recTensionMin: 48, recTensionMax: 58, level: "advanced" },
    { brand: "Head", model: "Gravity MP L 2023", headSize: 100, stringPattern: "16x20", weightUnstrung: 275, balance: "2 pts HL", stiffnessRa: 59, beamWidth: "23mm", recTensionMin: 46, recTensionMax: 56, level: "beginner" },
    { brand: "Head", model: "Prestige Mid 2023", headSize: 93, stringPattern: "18x20", weightUnstrung: 335, balance: "9 pts HL", stiffnessRa: 63, beamWidth: "19mm", recTensionMin: 52, recTensionMax: 62, level: "pro" },
    { brand: "Head", model: "Radical MP L 2023", headSize: 98, stringPattern: "18x20", weightUnstrung: 280, balance: "2 pts HL", stiffnessRa: 64, beamWidth: "22mm", recTensionMin: 48, recTensionMax: 58, level: "intermediate" },

    // ── YONEX ──
    // 2026 8th-gen VCORE update (aerodynamic beam, wider grommet holes)
    { brand: "Yonex", model: "VCORE 98 8th Gen", headSize: 98, stringPattern: "16x19", weightUnstrung: 305, balance: "6 pts HL", stiffnessRa: 66, beamWidth: "23/23.5/22mm", recTensionMin: 45, recTensionMax: 60, level: "advanced", year: 2026 },
    { brand: "Yonex", model: "EZONE 98 2022", headSize: 98, stringPattern: "16x19", weightUnstrung: 305, balance: "4 pts HL", stiffnessRa: 65, beamWidth: "23mm", recTensionMin: 45, recTensionMax: 60 },
    { brand: "Yonex", model: "EZONE 98 2025", headSize: 98, stringPattern: "16x19", weightUnstrung: 305, balance: "4 pts HL", stiffnessRa: 63, beamWidth: "24mm", recTensionMin: 45, recTensionMax: 60 },
    { brand: "Yonex", model: "EZONE 98 Tour 2022", headSize: 98, stringPattern: "16x19", weightUnstrung: 315, balance: "5 pts HL", stiffnessRa: 67, beamWidth: "23.5mm", recTensionMin: 45, recTensionMax: 60 },
    { brand: "Yonex", model: "EZONE 100 2022", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "3 pts HL", stiffnessRa: 65, beamWidth: "23mm", recTensionMin: 45, recTensionMax: 60 },
    { brand: "Yonex", model: "VCORE 98 2023", headSize: 98, stringPattern: "16x19", weightUnstrung: 305, balance: "4 pts HL", stiffnessRa: 64, beamWidth: "22/25/22mm", recTensionMin: 45, recTensionMax: 60 },
    { brand: "Yonex", model: "VCORE 98 Tour 2023", headSize: 98, stringPattern: "16x19", weightUnstrung: 315, balance: "5 pts HL", stiffnessRa: 65, beamWidth: "22/25/22mm", recTensionMin: 45, recTensionMax: 60 },
    { brand: "Yonex", model: "VCORE 100 2023", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "3 pts HL", stiffnessRa: 66, beamWidth: "23/26/22mm", recTensionMin: 45, recTensionMax: 60 },
    { brand: "Yonex", model: "Percept 97 2023", headSize: 97, stringPattern: "16x19", weightUnstrung: 310, balance: "5 pts HL", stiffnessRa: 62, beamWidth: "22mm", recTensionMin: 45, recTensionMax: 60 },
    { brand: "Yonex", model: "Percept 97H 2023", headSize: 97, stringPattern: "18x20", weightUnstrung: 320, balance: "7 pts HL", stiffnessRa: 62, beamWidth: "22mm", recTensionMin: 45, recTensionMax: 60 },
    { brand: "Yonex", model: "Percept 100 2023", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "3 pts HL", stiffnessRa: 60, beamWidth: "23mm", recTensionMin: 45, recTensionMax: 60 },
    { brand: "Yonex", model: "VCORE Pro 97 2020", headSize: 97, stringPattern: "16x19", weightUnstrung: 310, balance: "5 pts HL", stiffnessRa: 60, beamWidth: "21mm", recTensionMin: 45, recTensionMax: 60 },
    { brand: "Yonex", model: "VCORE Pro 97D", headSize: 97, stringPattern: "16x19", weightUnstrung: 320, balance: "6 pts HL", stiffnessRa: 61, beamWidth: "21mm", recTensionMin: 45, recTensionMax: 60 },
    { brand: "Yonex", model: "VCORE 98L 2023", headSize: 98, stringPattern: "16x19", weightUnstrung: 285, balance: "4 pts HL", stiffnessRa: 66, beamWidth: "22mm", recTensionMin: 45, recTensionMax: 60, level: "intermediate" },
    { brand: "Yonex", model: "VCORE 100L 2023", headSize: 100, stringPattern: "16x19", weightUnstrung: 280, balance: "2 pts HL", stiffnessRa: 66, beamWidth: "22mm", recTensionMin: 45, recTensionMax: 58, level: "beginner" },
    { brand: "Yonex", model: "EZONE 98L 2022", headSize: 98, stringPattern: "16x19", weightUnstrung: 285, balance: "4 pts HL", stiffnessRa: 65, beamWidth: "23mm", recTensionMin: 45, recTensionMax: 58, level: "intermediate" },
    { brand: "Yonex", model: "EZONE 100L 2022", headSize: 100, stringPattern: "16x19", weightUnstrung: 275, balance: "2 pts HL", stiffnessRa: 65, beamWidth: "23mm", recTensionMin: 45, recTensionMax: 56, level: "beginner" },

    // ── DUNLOP ──
    { brand: "Dunlop", model: "CX 200 2021", headSize: 98, stringPattern: "16x19", weightUnstrung: 305, balance: "5 pts HL", stiffnessRa: 62, beamWidth: "21mm", recTensionMin: 45, recTensionMax: 65 },
    { brand: "Dunlop", model: "CX 200 Tour 18x20", headSize: 98, stringPattern: "18x20", weightUnstrung: 310, balance: "7 pts HL", stiffnessRa: 62, beamWidth: "21mm", recTensionMin: 45, recTensionMax: 65 },
    { brand: "Dunlop", model: "CX 200 LS", headSize: 98, stringPattern: "16x19", weightUnstrung: 285, balance: "3 pts HL", stiffnessRa: 62, beamWidth: "21mm", recTensionMin: 45, recTensionMax: 65 },
    { brand: "Dunlop", model: "CX 400 Tour 2021", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 64, beamWidth: "23mm", recTensionMin: 45, recTensionMax: 65 },
    { brand: "Dunlop", model: "FX 500 2022", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 65, beamWidth: "25mm", recTensionMin: 45, recTensionMax: 65 },
    { brand: "Dunlop", model: "FX 500 Tour 2022", headSize: 100, stringPattern: "16x19", weightUnstrung: 310, balance: "5 pts HL", stiffnessRa: 66, beamWidth: "25mm", recTensionMin: 45, recTensionMax: 65 },
    { brand: "Dunlop", model: "SX 300 2022", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "3 pts HL", stiffnessRa: 68, beamWidth: "25mm", recTensionMin: 45, recTensionMax: 65 },
    { brand: "Dunlop", model: "CX 200 2024", headSize: 98, stringPattern: "16x19", weightUnstrung: 305, balance: "7 pts HL", stiffnessRa: 62, beamWidth: "21.5mm", recTensionMin: 50, recTensionMax: 60, level: "advanced" },
    { brand: "Dunlop", model: "CX 200 Tour 18x20 2024", headSize: 98, stringPattern: "18x20", weightUnstrung: 310, balance: "8 pts HL", stiffnessRa: 62, beamWidth: "21.5mm", recTensionMin: 50, recTensionMax: 60, level: "pro" },
    { brand: "Dunlop", model: "CX 400 2024", headSize: 100, stringPattern: "16x19", weightUnstrung: 290, balance: "4 pts HL", stiffnessRa: 65, beamWidth: "23mm", recTensionMin: 50, recTensionMax: 60, level: "intermediate" },
    { brand: "Dunlop", model: "SX 300 2024", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 70, beamWidth: "25mm", recTensionMin: 50, recTensionMax: 60, level: "intermediate" },
    { brand: "Dunlop", model: "SX 300 LS 2024", headSize: 100, stringPattern: "16x19", weightUnstrung: 270, balance: "0 pts HL", stiffnessRa: 70, beamWidth: "25mm", recTensionMin: 48, recTensionMax: 58, level: "beginner" },
    { brand: "Dunlop", model: "FX 500 2023", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 68, beamWidth: "25mm", recTensionMin: 50, recTensionMax: 60, level: "intermediate" },

    // ── TECNIFIBRE ──
    { brand: "Tecnifibre", model: "TF40 305 16x19", headSize: 98, stringPattern: "16x19", weightUnstrung: 305, balance: "6 pts HL", stiffnessRa: 61, beamWidth: "21mm", recTensionMin: 49, recTensionMax: 55 },
    { brand: "Tecnifibre", model: "TF40 315 18x20", headSize: 98, stringPattern: "18x20", weightUnstrung: 315, balance: "8 pts HL", stiffnessRa: 61, beamWidth: "21mm", recTensionMin: 49, recTensionMax: 55 },
    { brand: "Tecnifibre", model: "T-Fight 300 Isoflex", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 64, beamWidth: "22mm", recTensionMin: 50, recTensionMax: 57 },
    { brand: "Tecnifibre", model: "T-Fight 315 Isoflex", headSize: 98, stringPattern: "18x20", weightUnstrung: 315, balance: "6 pts HL", stiffnessRa: 63, beamWidth: "21mm", recTensionMin: 50, recTensionMax: 57 },
    { brand: "Tecnifibre", model: "T-Fight 305 RS", headSize: 98, stringPattern: "16x19", weightUnstrung: 305, balance: "5 pts HL", stiffnessRa: 63, beamWidth: "22mm", recTensionMin: 49, recTensionMax: 55 },
    { brand: "Tecnifibre", model: "TF-X1 300", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "3 pts HL", stiffnessRa: 66, beamWidth: "25mm", recTensionMin: 49, recTensionMax: 55 },
    { brand: "Tecnifibre", model: "Tempo 298 Iga", headSize: 98, stringPattern: "16x19", weightUnstrung: 298, balance: "4 pts HL", stiffnessRa: 64, beamWidth: "22mm", recTensionMin: 49, recTensionMax: 55 },
    { brand: "Tecnifibre", model: "T-Fight Iso 305 2024", headSize: 98, stringPattern: "18x19", weightUnstrung: 305, balance: "5 pts HL", stiffnessRa: 63, beamWidth: "21mm", recTensionMin: 49, recTensionMax: 55 },
    { brand: "Tecnifibre", model: "TF-X1 305 2022", headSize: 100, stringPattern: "16x19", weightUnstrung: 305, balance: "4 pts HL", stiffnessRa: 65, beamWidth: "23mm", recTensionMin: 48, recTensionMax: 58, level: "intermediate" },
    { brand: "Tecnifibre", model: "TF-X1 285 2022", headSize: 100, stringPattern: "16x19", weightUnstrung: 285, balance: "2 pts HL", stiffnessRa: 65, beamWidth: "23mm", recTensionMin: 46, recTensionMax: 56, level: "beginner" },
    { brand: "Tecnifibre", model: "TF-X1 275 2022", headSize: 102, stringPattern: "16x19", weightUnstrung: 275, balance: "0 pts HL", stiffnessRa: 65, beamWidth: "23mm", recTensionMin: 44, recTensionMax: 54, level: "beginner" },
    { brand: "Tecnifibre", model: "TF40 305 18x20 2022", headSize: 97, stringPattern: "18x20", weightUnstrung: 305, balance: "6 pts HL", stiffnessRa: 63, beamWidth: "21mm", recTensionMin: 48, recTensionMax: 58, level: "advanced" },
    { brand: "Tecnifibre", model: "TF40 315 14x18 2022", headSize: 97, stringPattern: "14x18", weightUnstrung: 315, balance: "8 pts HL", stiffnessRa: 63, beamWidth: "21mm", recTensionMin: 48, recTensionMax: 58, level: "pro" },
    { brand: "Tecnifibre", model: "Tempo 298 IGA 2023", headSize: 100, stringPattern: "16x19", weightUnstrung: 298, balance: "4 pts HL", stiffnessRa: 66, beamWidth: "23mm", recTensionMin: 48, recTensionMax: 58, level: "intermediate" },

    // ── PRINCE ──
    { brand: "Prince", model: "Phantom 100X 18x20", headSize: 100, stringPattern: "18x20", weightUnstrung: 305, balance: "5 pts HL", stiffnessRa: 58, beamWidth: "20mm", recTensionMin: 48, recTensionMax: 58 },
    { brand: "Prince", model: "ATS Textreme Tour 98", headSize: 98, stringPattern: "16x18", weightUnstrung: 305, balance: "5 pts HL", stiffnessRa: 58, beamWidth: "20mm", recTensionMin: 48, recTensionMax: 58 },
    { brand: "Prince", model: "ATS Textreme Tour 100P", headSize: 100, stringPattern: "16x15", weightUnstrung: 305, balance: "5 pts HL", stiffnessRa: 58, beamWidth: "20mm", recTensionMin: 45, recTensionMax: 55 },
    { brand: "Prince", model: "Ripstick 100 280", headSize: 100, stringPattern: "16x18", weightUnstrung: 280, balance: "3 pts HL", stiffnessRa: 62, beamWidth: "22mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Prince", model: "Warrior 100 310", headSize: 100, stringPattern: "16x19", weightUnstrung: 310, balance: "4 pts HL", stiffnessRa: 65, beamWidth: "24mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Prince", model: "Textreme Tour 100P 2022", headSize: 100, stringPattern: "16x18", weightUnstrung: 310, balance: "6 pts HL", stiffnessRa: 64, beamWidth: "22mm", recTensionMin: 50, recTensionMax: 60, level: "advanced" },
    { brand: "Prince", model: "Textreme Tour 95 2022", headSize: 95, stringPattern: "18x20", weightUnstrung: 320, balance: "8 pts HL", stiffnessRa: 64, beamWidth: "20mm", recTensionMin: 50, recTensionMax: 60, level: "pro" },
    { brand: "Prince", model: "Beast 100 2022", headSize: 100, stringPattern: "16x15", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 70, beamWidth: "26mm", recTensionMin: 50, recTensionMax: 60, level: "intermediate" },
    { brand: "Prince", model: "Phantom 100P 2022", headSize: 100, stringPattern: "16x18", weightUnstrung: 310, balance: "6 pts HL", stiffnessRa: 58, beamWidth: "21mm", recTensionMin: 48, recTensionMax: 58, level: "advanced" },

    // ── SOLINCO ──
    // 2025 Blackout V2 (Arch-2 construction, Foam Tech Core)
    { brand: "Solinco", model: "Blackout 300 v2 2025", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 68, beamWidth: "23.5/26/23mm", recTensionMin: 45, recTensionMax: 55, year: 2025 },
    { brand: "Solinco", model: "Blackout 285 v2 2025", headSize: 100, stringPattern: "16x19", weightUnstrung: 285, balance: "3 pts HL", stiffnessRa: 67, beamWidth: "23.5/26/23mm", recTensionMin: 45, recTensionMax: 55, level: "intermediate", year: 2025 },
    { brand: "Solinco", model: "Whiteout 305", headSize: 98, stringPattern: "16x19", weightUnstrung: 305, balance: "5 pts HL", stiffnessRa: 65, beamWidth: "22mm", recTensionMin: 45, recTensionMax: 55 },
    { brand: "Solinco", model: "Whiteout 305 XTD 18x20", headSize: 98, stringPattern: "18x20", weightUnstrung: 305, balance: "7 pts HL", stiffnessRa: 65, beamWidth: "22mm", recTensionMin: 45, recTensionMax: 55 },
    { brand: "Solinco", model: "Blackout 300", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 64, beamWidth: "23mm", recTensionMin: 45, recTensionMax: 55 },
    { brand: "Solinco", model: "Whiteout 290", headSize: 98, stringPattern: "16x19", weightUnstrung: 290, balance: "3 pts HL", stiffnessRa: 64, beamWidth: "22mm", recTensionMin: 45, recTensionMax: 55 },

    // ── VÖLKL ──
    { brand: "Völkl", model: "C10 Pro 2023", headSize: 98, stringPattern: "16x19", weightUnstrung: 330, balance: "9 pts HL", stiffnessRa: 58, beamWidth: "22mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Völkl", model: "V-Cell 8 315", headSize: 100, stringPattern: "16x18", weightUnstrung: 315, balance: "7 pts HL", stiffnessRa: 60, beamWidth: "22mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Völkl", model: "V-Cell 10 300", headSize: 98, stringPattern: "16x19", weightUnstrung: 300, balance: "5 pts HL", stiffnessRa: 62, beamWidth: "22mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Völkl", model: "V-Feel 8 300", headSize: 100, stringPattern: "16x19", weightUnstrung: 300, balance: "4 pts HL", stiffnessRa: 60, beamWidth: "23mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "Völkl", model: "C10 Pro 2022", headSize: 98, stringPattern: "18x20", weightUnstrung: 319, balance: "8 pts HL", stiffnessRa: 59, beamWidth: "20mm", recTensionMin: 48, recTensionMax: 58, level: "pro" },
    { brand: "Völkl", model: "V-Cell 8 2022", headSize: 98, stringPattern: "16x19", weightUnstrung: 305, balance: "6 pts HL", stiffnessRa: 62, beamWidth: "21mm", recTensionMin: 48, recTensionMax: 58, level: "advanced" },

    // ── PROKENNEX ──
    { brand: "ProKennex", model: "Ki Q+ Tour Pro 315", headSize: 98, stringPattern: "16x19", weightUnstrung: 315, balance: "8 pts HL", stiffnessRa: 63, beamWidth: "21mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "ProKennex", model: "Black Ace 300", headSize: 100, stringPattern: "16x20", weightUnstrung: 300, balance: "5 pts HL", stiffnessRa: 62, beamWidth: "22mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "ProKennex", model: "Ki Q+ 5 Pro 310", headSize: 100, stringPattern: "16x20", weightUnstrung: 310, balance: "7 pts HL", stiffnessRa: 63, beamWidth: "22mm", recTensionMin: 50, recTensionMax: 60 },
    { brand: "ProKennex", model: "Ki 15 280", headSize: 100, stringPattern: "16x19", weightUnstrung: 280, balance: "3 pts HL", stiffnessRa: 60, beamWidth: "24mm", recTensionMin: 48, recTensionMax: 57 },
    { brand: "ProKennex", model: "Ki Q+ Tour Pro 2022", headSize: 98, stringPattern: "16x19", weightUnstrung: 315, balance: "7 pts HL", stiffnessRa: 58, beamWidth: "21mm", recTensionMin: 48, recTensionMax: 58, level: "advanced" },
    { brand: "ProKennex", model: "Ki Q+ 5 2022", headSize: 100, stringPattern: "16x19", weightUnstrung: 265, balance: "0 pts HL", stiffnessRa: 56, beamWidth: "25mm", recTensionMin: 46, recTensionMax: 56, level: "beginner" },

    // ── DIADEM ──
    { brand: "Diadem", model: "Elevate 98 v3", headSize: 98, stringPattern: "16x19", weightUnstrung: 305, balance: "5 pts HL", stiffnessRa: 64, beamWidth: "22mm", recTensionMin: 48, recTensionMax: 58 },
    { brand: "Diadem", model: "Nova FS 100", headSize: 100, stringPattern: "16x19", weightUnstrung: 295, balance: "3 pts HL", stiffnessRa: 66, beamWidth: "24mm", recTensionMin: 48, recTensionMax: 58 },

    // ── SLAZENGER ──
    { brand: "Slazenger", model: "Pro Braided 2022", headSize: 100, stringPattern: "16x19", weightUnstrung: 295, balance: "4 pts HL", stiffnessRa: 65, beamWidth: "23mm", recTensionMin: 50, recTensionMax: 60, level: "intermediate" },

    // ── GAMMA ──
    { brand: "Gamma", model: "RZR 98 2022", headSize: 98, stringPattern: "16x19", weightUnstrung: 310, balance: "6 pts HL", stiffnessRa: 64, beamWidth: "21mm", recTensionMin: 48, recTensionMax: 58, level: "advanced" },

    // ── PACIFIC ──
    { brand: "Pacific", model: "X Force Pro 2022", headSize: 98, stringPattern: "16x19", weightUnstrung: 310, balance: "7 pts HL", stiffnessRa: 63, beamWidth: "21mm", recTensionMin: 48, recTensionMax: 58, level: "advanced" },
];
