/** Silent event boundary until an approved final whistle cue is supplied.
 * Keep the event/settings API so gameplay does not depend on audio availability.
 * No native player or asset is allocated in this version.
 */
export function useWhistleAudio(revision: number, soundEnabled: boolean): void {
  void revision;
  void soundEnabled;
}
