import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Gateway, Wallets, Contract, Network } from 'fabric-network';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class FabricService implements OnModuleInit {
  private readonly logger = new Logger(FabricService.name);
  private gateway: Gateway;
  private contract: Contract;
  private network: Network;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    try {
      await this.connect();
      this.logger.log('Successfully connected to Hyperledger Fabric network');
    } catch (error) {
      this.logger.warn(
        'Failed to connect to Fabric network. Blockchain features will be unavailable. ' +
          'The API will continue to serve auth, user, and metadata endpoints.',
      );
      this.logger.error('Fabric connection error details:', error);
    }
  }

  private async connect() {
    // Load connection profile
    const ccpPath = this.configService.get<string>('FABRIC_CONNECTION_PROFILE_PATH');
    if (!ccpPath || !fs.existsSync(ccpPath)) {
      throw new Error(
        `Connection profile not found at: ${ccpPath || '(not configured)'}. ` +
          'Run blockchain/network/scripts/bootstrap.sh to generate it.',
      );
    }
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // Create wallet
    const walletPath = this.configService.get<string>('FABRIC_WALLET_PATH');
    if (!walletPath || !fs.existsSync(walletPath)) {
      throw new Error(
        `Wallet directory not found at: ${walletPath || '(not configured)'}. ` +
          'Run blockchain/network/scripts/enroll_admin.sh to create it.',
      );
    }
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // Get identity from wallet
    const identity = await wallet.get('admin');
    if (!identity) {
      throw new Error(
        'Admin identity not found in wallet. ' +
          'Run blockchain/network/scripts/enroll_admin.sh to create it.',
      );
    }

    // Create gateway — asLocalhost=false when running inside Docker
    this.gateway = new Gateway();
    await this.gateway.connect(ccp, {
      wallet,
      identity: 'admin',
      discovery: { enabled: true, asLocalhost: false },
    });

    // Get network
    const channelName = this.configService.get<string>('FABRIC_CHANNEL_NAME', 'certificates');
    this.network = await this.gateway.getNetwork(channelName);

    // Get contract
    const chaincodeName = this.configService.get<string>(
      'FABRIC_CHAINCODE_NAME',
      'certificate_contract',
    );
    this.contract = this.network.getContract(chaincodeName);
  }

  async disconnect() {
    if (this.gateway) {
      this.gateway.disconnect();
      this.logger.log('Disconnected from Fabric network');
    }
  }

  private ensureConnected() {
    if (!this.contract) {
      throw new Error('Fabric network is not connected. Blockchain operations are unavailable.');
    }
  }

  // ============================================================================
  // Certificate Operations
  // ============================================================================

  async issueCertificate(
    certId: string,
    templateId: string,
    templateVersion: string,
    holderId: string,
    certHash: string,
    contentPointer: string,
    issuedAt: string,
    expiresAt: string,
    signatureProofRef: string,
  ): Promise<void> {
    this.ensureConnected();
    try {
      await this.contract.submitTransaction(
        'IssueCertificate',
        certId,
        templateId,
        templateVersion,
        holderId,
        certHash,
        contentPointer,
        issuedAt,
        expiresAt,
        signatureProofRef,
      );
      this.logger.log(`Certificate ${certId} issued successfully on blockchain`);
    } catch (error) {
      this.logger.error(`Failed to issue certificate ${certId}`, error);
      throw error;
    }
  }

  async getCertificateRecord(certId: string): Promise<any> {
    this.ensureConnected();
    try {
      const result = await this.contract.evaluateTransaction('GetCertificateRecord', certId);
      return JSON.parse(result.toString());
    } catch (error) {
      this.logger.error(`Failed to get certificate ${certId}`, error);
      throw error;
    }
  }

  async verifyCertificateRecord(certId: string, presentedHash?: string): Promise<any> {
    this.ensureConnected();
    try {
      const result = await this.contract.evaluateTransaction(
        'VerifyCertificateRecord',
        certId,
        presentedHash || '',
      );
      return JSON.parse(result.toString());
    } catch (error) {
      this.logger.error(`Failed to verify certificate ${certId}`, error);
      throw error;
    }
  }

  async revokeCertificate(
    certId: string,
    reasonCode: string,
    reasonText: string,
  ): Promise<void> {
    this.ensureConnected();
    try {
      await this.contract.submitTransaction('RevokeCertificate', certId, reasonCode, reasonText);
      this.logger.log(`Certificate ${certId} revoked successfully on blockchain`);
    } catch (error) {
      this.logger.error(`Failed to revoke certificate ${certId}`, error);
      throw error;
    }
  }

  async listCertificatesByHolder(
    holderId: string,
    pageSize: number = 20,
    bookmark: string = '',
  ): Promise<any> {
    this.ensureConnected();
    try {
      const result = await this.contract.evaluateTransaction(
        'ListCertificatesByHolder',
        holderId,
        pageSize.toString(),
        bookmark,
      );
      return JSON.parse(result.toString());
    } catch (error) {
      this.logger.error(`Failed to list certificates for holder ${holderId}`, error);
      throw error;
    }
  }

  async listCertificatesByIssuer(
    issuerOrgId: string,
    pageSize: number = 20,
    bookmark: string = '',
  ): Promise<any> {
    this.ensureConnected();
    try {
      const result = await this.contract.evaluateTransaction(
        'ListCertificatesByIssuer',
        issuerOrgId,
        pageSize.toString(),
        bookmark,
      );
      return JSON.parse(result.toString());
    } catch (error) {
      this.logger.error(`Failed to list certificates for issuer ${issuerOrgId}`, error);
      throw error;
    }
  }

  async getCertificateHistory(certId: string): Promise<any> {
    this.ensureConnected();
    try {
      const result = await this.contract.evaluateTransaction('GetCertificateHistory', certId);
      return JSON.parse(result.toString());
    } catch (error) {
      this.logger.error(`Failed to get history for certificate ${certId}`, error);
      throw error;
    }
  }

  // ============================================================================
  // Issuer Operations
  // ============================================================================

  async registerIssuer(
    issuerOrgId: string,
    displayName: string,
    publicKeySet: Record<string, string>,
    roles: string[],
    contactEmail: string,
    contactPerson: string,
  ): Promise<void> {
    this.ensureConnected();
    try {
      await this.contract.submitTransaction(
        'RegisterIssuer',
        issuerOrgId,
        displayName,
        JSON.stringify(publicKeySet),
        JSON.stringify(roles),
        contactEmail,
        contactPerson,
      );
      this.logger.log(`Issuer ${issuerOrgId} registered successfully`);
    } catch (error) {
      this.logger.error(`Failed to register issuer ${issuerOrgId}`, error);
      throw error;
    }
  }

  async getIssuer(issuerOrgId: string): Promise<any> {
    this.ensureConnected();
    try {
      const result = await this.contract.evaluateTransaction('GetIssuer', issuerOrgId);
      return JSON.parse(result.toString());
    } catch (error) {
      this.logger.error(`Failed to get issuer ${issuerOrgId}`, error);
      throw error;
    }
  }

  // ============================================================================
  // Template Operations
  // ============================================================================

  async createTemplate(
    templateId: string,
    version: string,
    displayName: string,
    description: string,
    jsonSchema: any,
    uiSchema: any,
    requiredClaims: string[],
    issuerConstraints: string[],
    validityDaysDefault: number,
    category: string,
  ): Promise<void> {
    this.ensureConnected();
    try {
      await this.contract.submitTransaction(
        'CreateTemplate',
        templateId,
        version,
        displayName,
        description,
        JSON.stringify(jsonSchema),
        JSON.stringify(uiSchema),
        JSON.stringify(requiredClaims),
        JSON.stringify(issuerConstraints),
        validityDaysDefault.toString(),
        category,
      );
      this.logger.log(`Template ${templateId} v${version} created successfully`);
    } catch (error) {
      this.logger.error(`Failed to create template ${templateId}`, error);
      throw error;
    }
  }

  async getTemplate(templateId: string, version: string): Promise<any> {
    this.ensureConnected();
    try {
      const result = await this.contract.evaluateTransaction('GetTemplate', templateId, version);
      return JSON.parse(result.toString());
    } catch (error) {
      this.logger.error(`Failed to get template ${templateId} v${version}`, error);
      throw error;
    }
  }

  // ============================================================================
  // Event Listening
  // ============================================================================

  async listenForEvents(eventName: string, callback: (event: any) => void) {
    this.ensureConnected();
    const listener = async (event: any) => {
      const payload = event.payload ? JSON.parse(event.payload.toString()) : {};
      this.logger.log(`Event ${eventName} received:`, payload);
      callback({ ...event, payload });
    };

    await this.contract.addContractListener(listener);

    this.logger.log(`Listening for ${eventName} events`);
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  isConnected(): boolean {
    return !!this.contract;
  }

  async getStatus(): Promise<{
    connected: boolean;
    channel?: string;
    chaincode?: string;
    blockHeight?: number;
    peers?: string[];
    error?: string;
  }> {
    if (!this.contract) {
      return { connected: false, error: 'Not connected to Fabric network' };
    }

    try {
      const channelName = this.configService.get<string>('FABRIC_CHANNEL_NAME', 'certificates');
      const chaincodeName = this.configService.get<string>('FABRIC_CHAINCODE_NAME', 'certificate_contract');

      let blockHeight: number | undefined;
      try {
        blockHeight = await this.queryBlockHeight(channelName);
      } catch (err: any) {
        this.logger.debug(`Could not query block height: ${err.message}`);
      }

      return {
        connected: true,
        channel: channelName,
        chaincode: chaincodeName,
        blockHeight,
      };
    } catch (error: any) {
      return { connected: false, error: error.message };
    }
  }

  /**
   * Query block height using the qscc system chaincode.
   * This is the reliable SDK v2.x approach.
   */
  private async queryBlockHeight(channelName: string): Promise<number | undefined> {
    if (!this.network) return undefined;

    try {
      // Method 1: Use the internal channel object (available on fabric-network v2.2)
      const channel = (this.network as any).channel;
      if (channel?.queryInfo) {
        const info = await channel.queryInfo();
        return info?.height?.low ?? info?.height?.toNumber?.() ?? undefined;
      }
    } catch (err: any) {
      this.logger.debug(`Channel queryInfo failed: ${err.message}`);
    }

    try {
      // Method 2: Use qscc system chaincode
      const qscc = this.network.getContract('qscc');
      const result = await qscc.evaluateTransaction('GetChainInfo', channelName);
      if (result && result.length > 0) {
        // The result is protobuf-encoded BlockchainInfo
        // Height is in the first varint field; parse it simply
        const height = this.parseBlockHeightFromProtobuf(result);
        if (height !== undefined) return height;
      }
    } catch (err: any) {
      this.logger.debug(`qscc GetChainInfo failed: ${err.message}`);
    }

    return undefined;
  }

  /**
   * Simple protobuf parser for BlockchainInfo to extract height.
   * BlockchainInfo { height: uint64 (field 1), ... }
   */
  private parseBlockHeightFromProtobuf(buffer: Uint8Array): number | undefined {
    try {
      // Field 1 (height) is a varint. Tag = (1 << 3) | 0 = 0x08
      if (buffer[0] === 0x08) {
        let height = 0;
        let shift = 0;
        for (let i = 1; i < buffer.length && i < 10; i++) {
          height |= (buffer[i] & 0x7f) << shift;
          if ((buffer[i] & 0x80) === 0) return height;
          shift += 7;
        }
      }
    } catch {
      // Fall through
    }
    return undefined;
  }

  async getBlockInfo(blockNumber: number): Promise<any> {
    if (!this.network) {
      throw new Error('Not connected to Fabric network');
    }

    try {
      // Try internal channel API first
      const channel = (this.network as any).channel;
      if (channel?.queryBlock) {
        const block = await channel.queryBlock(blockNumber);
        return this.formatBlock(block, blockNumber);
      }
    } catch (err: any) {
      this.logger.debug(`Channel queryBlock failed, trying qscc: ${err.message}`);
    }

    try {
      // Fallback: use qscc system chaincode
      const channelName = this.configService.get<string>('FABRIC_CHANNEL_NAME', 'certificates');
      const qscc = this.network.getContract('qscc');
      const result = await qscc.evaluateTransaction(
        'GetBlockByNumber',
        channelName,
        String(blockNumber),
      );

      if (result && result.length > 0) {
        // Return raw block data summary since protobuf parsing is complex
        return {
          blockNumber: String(blockNumber),
          dataHash: Buffer.from(result.slice(0, 32)).toString('hex'),
          previousHash: '',
          transactionCount: 0,
          transactions: [],
          rawSize: result.length,
        };
      }
    } catch (err: any) {
      this.logger.error(`qscc GetBlockByNumber failed: ${err.message}`);
    }

    throw new Error(`Block ${blockNumber} not found or not accessible`);
  }

  private formatBlock(block: any, blockNumber: number): any {
    if (!block) {
      throw new Error(`Block ${blockNumber} not found`);
    }

    const transactions = (block.data?.data || []).map((tx: any, i: number) => {
      try {
        const payload = tx.payload;
        const header = payload?.header;
        const channelHeader = header?.channel_header;
        return {
          index: i,
          txId: channelHeader?.tx_id || '',
          type: channelHeader?.type || 0,
          timestamp: channelHeader?.timestamp || '',
          channelId: channelHeader?.channel_id || '',
        };
      } catch {
        return { index: i, txId: 'unable to parse', type: 0 };
      }
    });

    return {
      blockNumber: block.header?.number?.toString() || String(blockNumber),
      dataHash: block.header?.data_hash
        ? Buffer.from(block.header.data_hash).toString('hex')
        : '',
      previousHash: block.header?.previous_hash
        ? Buffer.from(block.header.previous_hash).toString('hex')
        : '',
      transactionCount: transactions.length,
      transactions,
    };
  }

  async getRecentBlocks(count: number = 5): Promise<any[]> {
    if (!this.network) {
      throw new Error('Not connected to Fabric network');
    }

    const channelName = this.configService.get<string>('FABRIC_CHANNEL_NAME', 'certificates');
    const height = await this.queryBlockHeight(channelName);
    if (!height || height === 0) {
      return [];
    }

    const blocks: any[] = [];
    const startBlock = Math.max(0, height - count);
    for (let i = height - 1; i >= startBlock; i--) {
      try {
        const blockInfo = await this.getBlockInfo(i);
        blocks.push(blockInfo);
      } catch {
        break;
      }
    }

    return blocks;
  }

  getContract(): Contract {
    return this.contract;
  }

  getNetwork(): Network {
    return this.network;
  }

  getGateway(): Gateway {
    return this.gateway;
  }
}
