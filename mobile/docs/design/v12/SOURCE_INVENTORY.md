# V12 — Runtime source inventory

Source: `src/game/levels/stages/campaignStages.json`. Snapshot before V12 runtime changes. Dimensions are tile bounds, not usable floor area. Floor cell counts include '.' cells before prop collision and body-radius clearance; they are not proven walkable area. Counts and route length are descriptive evidence, not difficulty scores.

| ID | Title | Bounds | Floor cells before prop collision | Guards | CCTV | Props | Safe/Risk route length (tiles) |
|---|---|---|---:|---:|---:|---:|---|
| 01-01 | Entrance Hall | 21×14 | 129 | 2 | 0 | 8 | safe 21.77 / risk 14.64 |
| 01-02 | Main Gallery | 28×18 | 232 | 3 | 0 | 5 | safe 27.71 / risk 21.19 |
| 01-03 | Archive | 18×14 | 84 | 2 | 0 | 8 | safe 22.8 / risk 22.16 |
| 01-04 | Security Wing | 21×14 | 106 | 3 | 0 | 8 | safe 21.23 / risk 17.3 |
| 01-05 | Restricted Collection | 33×22 | 366 | 4 | 1 | 8 | safe 41.25 / risk 36.77 |
| 01-06 | Conservation Lab | 34×21 | 360 | 3 | 0 | 8 | safe 39.03 / risk 31.19 |
| 01-07 | Private Gallery | 17×20 | 170 | 3 | 0 | 12 | safe 26.0 / risk 17.96 |
| 01-08 | Security Core | 31×27 | 403 | 5 | 2 | 9 | safe 46.1 / risk 20.65 |
| 01-09 | Master Exhibition | 36×26 | 361 | 4 | 0 | 8 | safe 55.91 / risk 39.86 |
| 01-10 | Grand Heist | 38×31 | 686 | 6 | 2 | 12 | safe 57.78 / risk 25.32 |
| 02-01 | Front Exhibition | 24×18 | 206 | 2 | 0 | 17 | safe 23.82 / risk 21.76 |
| 02-02 | Portrait Hall | 24×20 | 244 | 3 | 0 | 22 | safe 26.61 / risk 24.41 |
| 02-03 | Sculpture Studio | 34×20 | 353 | 4 | 0 | 23 | safe 52.15 / risk 23.58 |
| 02-04 | Modern Wing | 34×30 | 427 | 4 | 0 | 26 | safe 40.42 / risk 23.51 |
| 02-05 | Collector's Room | 32×24 | 397 | 4 | 0 | 26 | safe 51.91 / risk 33.81 |
| 02-06 | Glass Gallery | 35×29 | 521 | 5 | 1 | 20 | safe 38.51 / risk 41.44 |
| 02-07 | Curator's Floor | 35×30 | 479 | 5 | 1 | 32 | safe 45.98 / risk 31.44 |
| 02-08 | Grand Atrium | 39×30 | 500 | 5 | 0 | 31 | safe 50.13 / risk 29.7 |
| 02-09 | Private Collection | 34×33 | 521 | 4 | 0 | 34 | safe 110.08 / risk 26.79 |
| 02-10 | Masterpiece | 38×34 | 750 | 7 | 2 | 22 | safe 66.67 / risk 35.77 |
| 03-01 | Public Lobby | 23×17 | 178 | 2 | 0 | 16 | safe 15.98 / risk 18.43 |
| 03-02 | Teller Hall | 23×22 | 250 | 3 | 1 | 22 | safe 30.54 / risk 28.92 |
| 03-03 | Staff Offices | 33×28 | 375 | 4 | 1 | 30 | safe 38.01 / risk 40.75 |
| 03-04 | Records Room | 27×23 | 281 | 4 | 0 | 21 | safe 28.75 / risk 30.37 |
| 03-05 | Deposit Boxes | 34×29 | 401 | 4 | 1 | 32 | safe 39.8 / risk 42.7 |
| 03-06 | Security Checkpoint | 34×30 | 381 | 4 | 2 | 26 | safe 47.99 / risk 28.32 |
| 03-07 | Cash Processing | 27×32 | 368 | 4 | 1 | 38 | safe 24.88 / risk 24.88 |
| 03-08 | Inner Security | 37×28 | 595 | 5 | 2 | 36 | safe 39.79 / risk 44.52 |
| 03-09 | Vault Antechamber | 34×25 | 350 | 5 | 2 | 25 | safe 44.88 / risk 30.12 |
| 03-10 | Main Vault | 40×42 | 774 | 7 | 3 | 53 | safe 106.25 / risk 58.78 |
| 04-01 | Observation Lobby | 20×18 | 248 | 3 | 0 | 24 | safe 20.44 / risk 4.92 |
| 04-02 | Research Wing | 21×19 | 292 | 3 | 0 | 35 | safe 24.06 / risk 19.91 |
| 04-03 | Specimen Lab | 22×20 | 337 | 4 | 0 | 29 | safe 33.03 / risk 8.73 |
| 04-04 | Containment Sector | 22×20 | 323 | 4 | 0 | 32 | safe 17.7 / risk 17.35 |
| 04-05 | Prototype Chamber | 22×23 | 373 | 5 | 0 | 39 | safe 24.57 / risk 20.04 |
| 05-01 | Hotel Reception | 20×18 | 270 | 3 | 0 | 29 | safe 19.5 / risk 9.71 |
| 05-02 | Gaming Floor | 20×21 | 325 | 3 | 0 | 46 | safe 18.16 / risk 16.6 |
| 05-03 | Service Lounge | 22×19 | 315 | 4 | 0 | 39 | safe 35.51 / risk 6.8 |
| 05-04 | VIP Salon | 22×21 | 353 | 4 | 0 | 34 | safe 27.04 / risk 21.98 |
| 05-05 | Royal Jewel Room | 24×21 | 383 | 5 | 0 | 37 | safe 39.78 / risk 7.76 |
| 06-01 | Garden Vestibule | 19×19 | 267 | 3 | 0 | 27 | safe 27.44 / risk 16.5 |
| 06-02 | Drawing Room | 22×18 | 298 | 3 | 0 | 33 | safe 35.86 / risk 4.92 |
| 06-03 | Library Wing | 23×20 | 346 | 4 | 0 | 47 | safe 28.96 / risk 7.28 |
| 06-04 | Family Apartments | 23×20 | 353 | 4 | 0 | 41 | safe 39.23 / risk 10.69 |
| 06-05 | Heirloom Gallery | 23×24 | 424 | 5 | 0 | 49 | safe 41.26 / risk 8.25 |
| 07-01 | Loading Entrance | 21×19 | 284 | 4 | 0 | 31 | safe 23.27 / risk 19.87 |
| 07-02 | Cargo Sorting | 21×22 | 322 | 4 | 0 | 27 | safe 33.39 / risk 19.92 |
| 07-03 | Storage Aisles | 23×20 | 351 | 5 | 0 | 30 | safe 34.32 / risk 18.07 |
| 07-04 | Inspection Bay | 23×22 | 389 | 5 | 0 | 45 | safe 40.46 / risk 18.46 |
| 07-05 | Secured Shipment | 25×22 | 388 | 6 | 0 | 23 | safe 40.27 / risk 21.21 |
| 08-01 | Security Reception | 20×20 | 294 | 4 | 0 | 41 | safe 17.42 / risk 15.4 |
| 08-02 | Monitoring Room | 23×19 | 315 | 4 | 0 | 33 | safe 36.95 / risk 14.71 |
| 08-03 | Server Wing | 22×22 | 373 | 5 | 0 | 38 | safe 35.26 / risk 19.05 |
| 08-04 | Restricted Corridor | 24×20 | 362 | 5 | 0 | 28 | safe 33.69 / risk 21.52 |
| 08-05 | Black Site Archive | 23×25 | 407 | 6 | 0 | 47 | safe 40.2 / risk 21.39 |
| 09-01 | Outer Checkpoint | 21×21 | 319 | 4 | 0 | 44 | safe 18.4 / risk 16.49 |
| 09-02 | Vault Antechamber | 21×24 | 387 | 4 | 0 | 42 | safe 41.58 / risk 16.62 |
| 09-03 | Mechanism Hall | 23×24 | 427 | 5 | 0 | 52 | safe 27.2 / risk 7.28 |
| 09-04 | Security Ring | 22×25 | 422 | 5 | 0 | 46 | safe 36.92 / risk 22.8 |
| 09-05 | Master Diamond Chamber | 26×24 | 467 | 6 | 0 | 51 | safe 31.72 / risk 9.22 |
