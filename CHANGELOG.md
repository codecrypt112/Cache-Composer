# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-11-16

### Added
- Initial release
- Multi-layer caching (Memory, Redis, File)
- LRU and LFU invalidation strategies
- TTL-based expiration
- Cache warming on startup
- Tag-based invalidation
- Pattern-based invalidation
- Batch operations (mget, mset)
- Comprehensive analytics and statistics
- Get-or-set pattern support
- Full TypeScript support
- Universal compatibility (Node.js, React, Browser)
- Complete documentation and examples

### Features
- Automatic cache promotion between layers
- Hit/miss rate tracking
- Per-layer statistics
- Average access time monitoring
- Touch operation for TTL refresh
- Clear and delete operations
- Key existence checking
- Size tracking

[1.0.0]: https://github.com/codecrypt112/Cache-Composer/releases/tag/v1.0.0
