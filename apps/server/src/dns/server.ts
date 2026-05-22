import * as dgram from "node:dgram";
import * as net from "node:net";
import type { DnsHandler } from "./handler.js";

export class DnsServer {
  private udpSocket: dgram.Socket | null = null;
  private tcpServer: net.Server | null = null;

  constructor(
    private handler: DnsHandler,
    private port: number,
    private bind: string,
  ) {}

  start(): void {
    this.startUdp();
    this.startTcp();
    console.log(`[dns] Listening on ${this.bind}:${this.port} (UDP/TCP)`);
  }

  stop(): void {
    this.udpSocket?.close();
    this.tcpServer?.close();
    this.udpSocket = null;
    this.tcpServer = null;
  }

  private startUdp(): void {
    this.udpSocket = dgram.createSocket("udp4");
    this.udpSocket.on("message", async (msg, rinfo) => {
      try {
        const response = await this.handler.handle(Buffer.from(msg), rinfo.address);
        this.udpSocket?.send(response, rinfo.port, rinfo.address);
      } catch (err) {
        console.error("[dns] UDP error:", err);
      }
    });
    this.udpSocket.bind(this.port, this.bind);
  }

  private startTcp(): void {
    this.tcpServer = net.createServer((socket) => {
      let buffer = Buffer.alloc(0);

      socket.on("data", (chunk: Buffer) => {
        buffer = Buffer.concat([buffer, chunk]);
        void (async () => {
        while (buffer.length >= 2) {
          const len = buffer.readUInt16BE(0);
          if (buffer.length < len + 2) break;
          const query = buffer.subarray(2, len + 2);
          buffer = buffer.subarray(len + 2);
          try {
            const response = await this.handler.handle(query, socket.remoteAddress ?? "unknown");
            const header = Buffer.alloc(2);
            header.writeUInt16BE(response.length);
            socket.write(Buffer.concat([header, response]));
          } catch (err) {
            console.error("[dns] TCP error:", err);
          }
        }
        })();
      });
    });
    this.tcpServer.listen(this.port, this.bind);
  }
}
