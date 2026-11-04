/** Ten-mission Museum expansion: independently authored additions. */
import type {V13Mission} from './v13Types';
import {V13_MUSEUM_DISTINCT} from './v13MuseumDistinct';
import {V13_MUSEUM_FINALE} from './v13MuseumFinale';
/** Reviewed security archetypes; the new geometry never strengthens their constants. */
export const MUSEUM_EXPANSION_ARCHETYPES:Record<string,string>={
 '01-06':'01-01','01-07':'01-02','01-08':'01-03','01-09':'01-04','01-10':'01-05',
};
export const MUSEUM_EXPANSION_NAMES_KO=['서쪽 전시동','조각 안뜰','보존실 순환로','카메라 교차로','왕관 수집실'];
export const V13_MUSEUM_EXPANSION:V13Mission[]=[...V13_MUSEUM_DISTINCT,...V13_MUSEUM_FINALE];
