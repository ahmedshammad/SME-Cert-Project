import { useState, useEffect } from 'react';
import {
  Box, Activity, Hash, Clock, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, RefreshCw, Loader2, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { certificateApi } from '@/services/api/certificates';
import { cn } from '@/lib/utils';

type BlockchainStatus = {
  timestamp: string;
  blockchain: {
    connected: boolean;
    channel?: string;
    chaincode?: string;
    blockHeight?: number;
    error?: string;
  };
};

type BlockInfo = {
  blockNumber: string;
  dataHash: string;
  previousHash: string;
  transactionCount: number;
  transactions: {
    index: number;
    txId: string;
    type: number;
    timestamp: string;
    channelId: string;
  }[];
};

type BlocksResponse = {
  timestamp: string;
  count: number;
  blocks: BlockInfo[];
  error?: string;
};

export function BlockchainExplorerPage() {
  const [status, setStatus] = useState<BlockchainStatus | null>(null);
  const [blocksData, setBlocksData] = useState<BlocksResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [blocksLoading, setBlocksLoading] = useState(false);
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);
  const [blockCount, setBlockCount] = useState(10);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await certificateApi.getBlockchainStatus();
      setStatus(data);
    } catch {
      setStatus({
        timestamp: new Date().toISOString(),
        blockchain: { connected: false, error: 'Failed to fetch blockchain status' },
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBlocks = async () => {
    setBlocksLoading(true);
    try {
      const data = await certificateApi.getRecentBlocks(blockCount);
      setBlocksData(data);
    } catch {
      setBlocksData({ timestamp: new Date().toISOString(), count: 0, blocks: [], error: 'Failed to fetch blocks' });
    } finally {
      setBlocksLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchBlocks();
  }, []);

  const refreshAll = () => {
    fetchStatus();
    fetchBlocks();
  };

  const connected = status?.blockchain?.connected ?? false;

  return (
    <div>
      {/* Hero */}
      <section className="gradient-hero-subtle py-12 md:py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Badge variant="navy" className="mb-4">
            <Layers className="h-3.5 w-3.5 mr-1.5" />
            Blockchain Explorer
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
            Blockchain Network Status
          </h1>
          <p className="text-muted-foreground">
            View the live status of the Hyperledger Fabric network and browse on-chain blocks.
          </p>
        </div>
      </section>

      <div className="container mx-auto max-w-4xl py-8 px-4 space-y-6">
        {/* Refresh Button */}
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={refreshAll} disabled={loading || blocksLoading}>
            <RefreshCw className={cn('h-4 w-4 mr-2', (loading || blocksLoading) && 'animate-spin')} />
            Refresh
          </Button>
        </div>

        {/* Network Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Network Status
            </CardTitle>
            <CardDescription>Current state of the Hyperledger Fabric blockchain network</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Checking network status...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Connection Status */}
                <div className={cn(
                  'p-4 rounded-lg border-2',
                  connected ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                )}>
                  <div className="flex items-center gap-2 mb-1">
                    {connected ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className="text-sm font-medium">
                      {connected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Network Connection</p>
                </div>

                {/* Channel */}
                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-lg font-bold text-primary">
                    {status?.blockchain?.channel || '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">Channel Name</p>
                </div>

                {/* Chaincode */}
                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-lg font-bold text-primary truncate" title={status?.blockchain?.chaincode}>
                    {status?.blockchain?.chaincode || '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">Chaincode</p>
                </div>

                {/* Block Height */}
                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="text-lg font-bold text-primary">
                    {status?.blockchain?.blockHeight !== undefined ? status.blockchain.blockHeight : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">Block Height</p>
                </div>
              </div>
            )}

            {/* Error Display */}
            {status?.blockchain?.error && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                {status.blockchain.error}
              </div>
            )}

            {/* Network Architecture Info */}
            {connected && (
              <div className="mt-4 p-4 rounded-lg bg-muted/50 text-sm">
                <p className="font-medium mb-2">Network Architecture</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Orderers:</span>
                    <span className="ml-1 font-medium">3 (Raft)</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Peers:</span>
                    <span className="ml-1 font-medium">8 (2/org)</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Organizations:</span>
                    <span className="ml-1 font-medium">4</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">State DB:</span>
                    <span className="ml-1 font-medium">CouchDB</span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Block Explorer */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Box className="h-5 w-5" />
                  Block Explorer
                </CardTitle>
                <CardDescription>Browse blocks recorded on the blockchain</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={blockCount}
                  onChange={(e) => setBlockCount(Number(e.target.value))}
                  className="text-sm border rounded-md px-2 py-1"
                >
                  <option value={5}>Last 5</option>
                  <option value={10}>Last 10</option>
                  <option value={20}>Last 20</option>
                </select>
                <Button variant="outline" size="sm" onClick={fetchBlocks} disabled={blocksLoading}>
                  {blocksLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {blocksLoading && !blocksData ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading blocks...</span>
              </div>
            ) : blocksData?.error ? (
              <div className="text-center py-8">
                <XCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">{blocksData.error}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  The blockchain network may not be running. Start the Fabric network to see blocks.
                </p>
              </div>
            ) : blocksData?.blocks?.length === 0 ? (
              <div className="text-center py-8">
                <Box className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No blocks found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Blocks will appear here once the blockchain network is running and transactions are recorded.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {blocksData?.blocks?.map((block) => {
                  const isExpanded = expandedBlock === block.blockNumber;
                  return (
                    <div key={block.blockNumber} className="border rounded-lg overflow-hidden">
                      {/* Block Header */}
                      <button
                        onClick={() => setExpandedBlock(isExpanded ? null : block.blockNumber)}
                        className="w-full flex items-center justify-between p-3 hover:bg-muted/30 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Box className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">Block #{block.blockNumber}</p>
                            <p className="text-xs text-muted-foreground">
                              {block.transactionCount} transaction{block.transactionCount !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right hidden sm:block">
                            <p className="text-xs font-mono text-muted-foreground">
                              {block.dataHash ? `${block.dataHash.substring(0, 16)}...` : ''}
                            </p>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </button>

                      {/* Block Details (expanded) */}
                      {isExpanded && (
                        <div className="border-t px-4 py-3 bg-muted/20 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-muted-foreground">Data Hash:</span>
                              <p className="font-mono break-all mt-0.5">{block.dataHash || '—'}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Previous Hash:</span>
                              <p className="font-mono break-all mt-0.5">{block.previousHash || '—'}</p>
                            </div>
                          </div>

                          {/* Transactions */}
                          {block.transactions?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium mb-2">Transactions</p>
                              <div className="space-y-1.5">
                                {block.transactions.map((tx) => (
                                  <div key={tx.index} className="p-2 rounded bg-white border text-xs">
                                    <div className="flex items-center justify-between flex-wrap gap-1">
                                      <div className="flex items-center gap-2">
                                        <Hash className="h-3 w-3 text-muted-foreground shrink-0" />
                                        <span className="font-mono break-all">
                                          {tx.txId ? `${tx.txId.substring(0, 32)}...` : 'Config TX'}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {tx.timestamp && (
                                          <span className="text-muted-foreground flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {new Date(tx.timestamp).toLocaleString()}
                                          </span>
                                        )}
                                        <Badge variant="outline" className="text-[10px] py-0">
                                          Type {tx.type}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card>
          <CardContent className="py-4">
            <div className="p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <p className="font-medium mb-1">About the Blockchain</p>
              <p>
                This platform uses Hyperledger Fabric, an enterprise-grade permissioned blockchain.
                Each certificate issuance, verification, and revocation is recorded as an immutable
                transaction on-chain. The network is operated by a 4-organization consortium:
                Ministry of Trade & Industry, MSMEDA, Training Providers, and Auditors.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
