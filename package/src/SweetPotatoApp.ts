import { SweetPotato } from './SweetPotato.js';

let instance: SweetPotato | undefined;

export function SweetPotatoApp(): SweetPotato {
  if (!instance) {
    instance = new SweetPotato();
  }
  return instance;
}
