import "server-only";
import { HCI_HOSTED_RELEASE } from "./hci-release";
import { requestHostedHci } from "./hci-service-core";

export function hostedHciConsultation(staffId: string, command: unknown) {
  return requestHostedHci({
    env: process.env,
    release: HCI_HOSTED_RELEASE,
    staffId,
    command,
  });
}
