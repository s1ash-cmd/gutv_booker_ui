import { api } from "./api";

export function get_all_models() {
  return api("/Equipment/get_all_models");
}
