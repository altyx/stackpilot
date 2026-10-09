import type { LegalDocument } from './document';
import { PRIVACY_POLICY_URL, PUBLISHER, SOURCE_CODE_URL } from './publisher';

/**
 * Terms of use.
 *
 * The text describes how the app actually behaves: direct connection to the
 * instance, tokens in the keychain, notifications relayed by Expo. Any
 * change to these points must be reflected here, with a new date.
 */
export const TERMS: LegalDocument = {
  title: 'Terms of Use',
  updatedAt: 'October 9, 2026',
  intro:
    'These terms of use (the "Terms") govern the use of the StackPilot mobile application (the "App"). By using the App, you accept these Terms in full; if you do not accept them, do not use the App.',
  sections: [
    {
      title: 'Publisher',
      body: [
        `The App is published by ${PUBLISHER.name} (${PUBLISHER.legalStatus}).`,
        `Publication director: ${PUBLISHER.publicationDirector}.`,
        `Contact: ${PUBLISHER.email}.`,
        "The App is distributed through Apple's App Store and Google Play. It does not rely on any server operated by the publisher.",
      ],
    },
    {
      title: 'Purpose of the App',
      body: [
        'StackPilot is a mobile client for Portainer, the container management tool. It lets you view the Docker environments of a Portainer instance you have access to (containers, stacks, images, volumes, logs, resource usage and disk space) and act on them, in particular by starting, stopping, restarting, pausing, killing or deleting containers, starting or stopping stacks, redeploying a stack or editing its environment variables, recreating a container to update its image, or deleting images and volumes that no container uses.',
        'The App is an independent project: it is not published by, affiliated with or endorsed by Portainer.io or Docker, Inc. "Portainer" and "Docker" are trademarks of their respective owners.',
      ],
    },
    {
      title: 'Access to the App',
      body: [
        'The App is offered free of charge. Using it requires a Portainer instance and valid credentials: an access token, or a username and password.',
        'You agree to connect the App only to instances you administer or that you have been authorized to access. Fraudulently accessing or remaining in a computer system, or hindering its operation, is punishable under articles 323-1 et seq. of the French Criminal Code.',
        "The features available depend on your instance's version and on your Portainer account's permissions. Kubernetes environments are not supported.",
      ],
    },
    {
      title: 'Operation and security',
      body: [
        'The App communicates directly with the Portainer instance whose address you enter: your data does not pass through any server of the publisher.',
        "Your access token, or the session token obtained with your password, is kept in the device's secure keychain (Keychain on iOS, Keystore on Android). The password itself is never stored.",
        'Actions triggered from the App run with the permissions of the Portainer account used; the App does not let you exceed them.',
        "The App always verifies your instance's certificate over HTTPS. It accepts the certificate authorities the system trusts and those you have installed on the device yourself; it does not accept a self-signed certificate that chains to none of them. Installing a certificate authority on the device is your responsibility: only do so for an authority you control.",
        'It is up to you to protect access to your instance: encrypted connection (HTTPS), tokens limited to the permissions needed, revocation of unused tokens.',
      ],
    },
    {
      title: 'Your responsibilities',
      body: [
        'You are responsible for:',
        [
          'the security of your device (passcode, system updates) and the confidentiality of your credentials;',
          "the actions performed from the App: starting, stopping, restarting, pausing or killing a container or a stack can interrupt the services that depend on it, and killing a container can lose its in-progress writes; deleting a container erases everything not kept in a volume; redeploying a stack, including to apply new variables, recreates its containers and may apply a new version of its Git repository or of its images; updating a container's image deletes and recreates it, which erases the data not kept in a volume; deleting an image means pulling it again to use it, and a locally built image cannot be recovered; deleting a volume permanently erases the data it contains;",
          'the configuration, security and backups of your Portainer instance and of the services it manages;',
          'the monitoring service you deploy to receive notifications.',
        ],
        'Actions on a stack are applied container by container, regardless of the dependency order between its services. When that order matters, act on each container separately.',
        'If your device is lost or stolen, promptly revoke, from Portainer, the access token used by the App, or change your password if you signed in with it.',
      ],
    },
    {
      title: 'Notifications',
      body: [
        "Notifications are optional. They rely on a monitoring service you deploy yourself on your infrastructure: it watches Docker events and sends alerts to your device through Expo's notification service, then through Apple Push Notification service (iOS) or Firebase Cloud Messaging (Android).",
        'The content of an alert (container name, reason for the alert, environment and container identifiers) passes through these providers, under their own terms.',
        'The publisher operates none of these services and guarantees neither the delivery nor the timeliness of alerts. Do not make the App your only way of monitoring critical services.',
      ],
    },
    {
      title: 'Personal data',
      body: [
        'The publisher collects no personal data through the App: it requires no StackPilot account and contains neither analytics nor advertising.',
        `The data the App uses, how long it is kept and your rights are described in the privacy policy, available in the App and at ${PRIVACY_POLICY_URL}.`,
      ],
    },
    {
      title: 'Intellectual property',
      body: [
        `The App's source code is published under the MIT license, which sets the conditions for reusing it: ${SOURCE_CODE_URL}.`,
        'The name "StackPilot" and the App\'s logo remain the property of the publisher.',
      ],
    },
    {
      title: 'Availability and warranties',
      body: [
        'The App is provided free of charge and "as is". The publisher strives to keep it working properly, without guaranteeing that it is free of errors, compatible with every version of Portainer or permanently available.',
        'The publisher may change the App, suspend its distribution or discontinue it at any time.',
      ],
    },
    {
      title: 'Liability',
      body: [
        'To the extent permitted by law, the publisher cannot be held liable for damage resulting from:',
        [
          'an action performed from the App;',
          'an error or unavailability of the App, of your Portainer instance or of the third-party services mentioned in these Terms;',
          'an alert not received or received late;',
          "a third party's access to your device or to your credentials.",
        ],
        "These limitations do not apply where the law prohibits restricting the publisher's liability.",
      ],
    },
    {
      title: 'Changes to the Terms',
      body: [
        'The publisher may change these Terms, in particular to reflect changes to the App or to regulations. The date of the last update appears at the top of the document. Continuing to use the App after a change means accepting the new version.',
      ],
    },
    {
      title: 'Term',
      body: [
        'These Terms apply for as long as you use the App. You may end them at any time: sign out, uninstall the App and revoke, from Portainer, the access tokens created for it.',
      ],
    },
    {
      title: 'Governing law and disputes',
      body: [
        'These Terms are governed by French law. In the event of a dispute, first contact the publisher to seek an amicable solution. Failing that, the dispute will be brought before the competent courts under the ordinary rules of law.',
      ],
    },
  ],
};
