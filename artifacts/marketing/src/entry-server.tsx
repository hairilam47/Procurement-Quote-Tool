import { renderToString } from "react-dom/server";
import App from "./App";

export async function render(): Promise<string> {
  return renderToString(<App />);
}
