/** Types de l'API Portainer et de l'API Docker exposée via son proxy. */

export type AuthMode = 'apiKey' | 'jwt';

export interface Session {
  /** URL de base de l'instance, sans le suffixe `/api` (ex: https://portainer.lan:9443). */
  baseUrl: string;
  mode: AuthMode;
  /** Access token `ptr_...` en mode apiKey, JWT en mode jwt. */
  token: string;
  /** Renseigné en mode jwt, pour l'affichage uniquement. */
  username?: string;
}

export interface PortainerStatus {
  Version: string;
  InstanceID?: string;
}

/** Types d'environnement Portainer (`EndpointType`). */
export enum EndpointType {
  DockerLocal = 1,
  DockerAgent = 2,
  Azure = 3,
  DockerEdgeAgent = 4,
  KubernetesLocal = 5,
  KubernetesAgent = 6,
  KubernetesEdgeAgent = 7,
}

export interface Endpoint {
  Id: number;
  Name: string;
  Type: EndpointType;
  URL: string;
  GroupId?: number;
  Status: number; // 1 = up, 2 = down
  Snapshots?: DockerSnapshot[];
}

export interface DockerSnapshot {
  DockerVersion?: string;
  RunningContainerCount?: number;
  StoppedContainerCount?: number;
  HealthyContainerCount?: number;
  UnhealthyContainerCount?: number;
  ImageCount?: number;
  VolumeCount?: number;
  StackCount?: number;
  TotalCPU?: number;
  TotalMemory?: number;
}

export type ContainerState =
  | 'created'
  | 'running'
  | 'paused'
  | 'restarting'
  | 'removing'
  | 'exited'
  | 'dead';

export interface ContainerPort {
  IP?: string;
  PrivatePort: number;
  PublicPort?: number;
  Type: string;
}

export interface ContainerMount {
  Type: string;
  /** Renseigné uniquement pour les montages de type `volume`. */
  Name?: string;
  Source: string;
  Destination: string;
  RW: boolean;
}

/** Élément de `GET /containers/json`. */
export interface ContainerSummary {
  Id: string;
  Names: string[];
  Image: string;
  ImageID: string;
  Command: string;
  Created: number;
  State: ContainerState;
  Status: string;
  Ports: ContainerPort[];
  Labels: Record<string, string>;
  Mounts?: ContainerMount[];
}

/** Élément de `GET /images/json`. */
export interface ImageSummary {
  Id: string;
  ParentId: string;
  RepoTags: string[] | null;
  RepoDigests: string[] | null;
  Created: number;
  Size: number;
  SharedSize: number;
  Labels: Record<string, string> | null;
}

/** Élément de `GET /volumes`. */
export interface VolumeSummary {
  Name: string;
  Driver: string;
  Mountpoint: string;
  CreatedAt?: string;
  Scope: string;
  Labels: Record<string, string> | null;
  Options: Record<string, string> | null;
}

export interface VolumeListResponse {
  Volumes: VolumeSummary[] | null;
  Warnings: string[] | null;
}

/** Sous-ensemble de `GET /containers/{id}/json` utilisé par l'app. */
export interface ContainerInspect {
  Id: string;
  Name: string;
  Created: string;
  Image: string;
  State: {
    Status: ContainerState;
    Running: boolean;
    Paused: boolean;
    Restarting: boolean;
    ExitCode: number;
    StartedAt: string;
    FinishedAt: string;
    Health?: { Status: string; FailingStreak: number };
  };
  Config: {
    Image: string;
    Env: string[] | null;
    Cmd: string[] | null;
    Labels: Record<string, string>;
  };
  HostConfig: {
    RestartPolicy?: { Name: string; MaximumRetryCount: number };
    NetworkMode?: string;
  };
  Mounts: Array<{
    Type: string;
    Source: string;
    Destination: string;
    RW: boolean;
  }>;
  NetworkSettings: {
    Networks: Record<string, { IPAddress: string; Gateway: string }>;
  };
}

export type ContainerAction = 'start' | 'stop' | 'restart' | 'pause' | 'unpause' | 'kill';

/** Actions groupées proposées au niveau d'une stack. */
export type StackAction = Extract<ContainerAction, 'start' | 'stop'>;
