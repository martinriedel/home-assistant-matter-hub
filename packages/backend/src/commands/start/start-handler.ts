import type { BridgeBasicInformation } from "@home-assistant-matter-hub/common";
import { Environment, VendorId } from "@matter/main";
import AsyncLock from "async-lock";
import * as ws from "ws";
import type { ArgumentsCamelCase } from "yargs";
import { WebApi } from "../../api/web-api.js";
import { createEnvironment } from "../../environment/environment.js";
import { HomeAssistantClient } from "../../home-assistant/home-assistant-client.js";
import { BridgeService } from "../../matter/bridge-service.js";
import type { StartOptions } from "./start-options.js";

const basicInformation: BridgeBasicInformation = {
  vendorId: VendorId(0xfff1),
  vendorName: "t0bst4r",
  productId: 0x8000,
  productName: "MatterHub",
  productLabel: "Home Assistant Matter Hub",
  hardwareVersion: new Date().getFullYear(),
  softwareVersion: new Date().getFullYear(),
};

export async function startHandler(
  options: ArgumentsCamelCase<StartOptions>,
  webUiDist?: string,
): Promise<void> {
  Object.assign(globalThis, {
    WebSocket: globalThis.WebSocket ?? ws.WebSocket,
  });

  const environment = createEnvironment(Environment.default, {
    mdnsNetworkInterface: options.mdnsNetworkInterface,
    storageLocation: options.storageLocation,
    logLevel: options.logLevel,
    disableLogColors: options.disableLogColors,
  });
  environment.set(AsyncLock, new AsyncLock());

  const homeAssistantClient = new HomeAssistantClient(environment, {
    url: options.homeAssistantUrl,
    accessToken: options.homeAssistantAccessToken,
  });

  const bridgeService = new BridgeService(environment, basicInformation);

  const webApi = new WebApi(environment, {
    port: options.httpPort,
    whitelist: options.httpIpWhitelist?.map((item) => item.toString()),
    webUiDist,
    ...(options.httpAuthUsername && options.httpAuthPassword
      ? {
          auth: {
            username: options.httpAuthUsername,
            password: options.httpAuthPassword,
          },
        }
      : {}),
  });

  await Promise.all([
    homeAssistantClient.construction,
    bridgeService.construction,
    webApi.construction,
  ]);
}
