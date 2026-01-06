# Performance Optimization Guide

This document outlines the performance optimizations implemented in the ALS Student Tracker system.

## Optimizations Implemented

### 1. Next.js Configuration
- **Compression**: Enabled gzip compression for all responses
- **Image Optimization**: Configured AVIF and WebP formats with proper caching
- **Code Splitting**: Optimized webpack configuration to split vendor chunks (leaflet, recharts, etc.)
- **Package Optimization**: Enabled tree-shaking for commonly used packages

### 2. API Optimizations
- **Database Projections**: Only fetch required fields from MongoDB to reduce payload size
- **Smart Caching**: Added appropriate Cache-Control headers:
  - Students: 60s cache, 120s stale-while-revalidate
  - Barangays: 300s cache, 600s stale-while-revalidate (rarely change)
  - Progress: 30s cache, 60s stale-while-revalidate
- **Reduced Logging**: Console logs only in development mode

### 3. Component Lazy Loading
- **Heavy Components**: Dynamically imported with `next/dynamic`:
  - InteractiveMap (already lazy loaded)
  - ActivityTable
  - StudentTable
  - StudentDialog
  - StudentDetailsDialog
  - SchoolCalendar
  - UpcomingEvents
  - VisionMission
  - StudentsByBarangayChart
- **Benefits**: Reduces initial bundle size and improves Time to Interactive (TTI)

### 4. Font Optimization
- **Display Swap**: Fonts use `display: swap` to show fallback immediately
- **Preload**: Critical fonts are preloaded for faster rendering

### 5. Database Query Optimization
- **Projections**: Only fetch necessary fields:
  - Students: Excludes large assessment/pisScore fields
  - Barangays: Only essential location and name data
  - Modules: Only core module structure
  - Progress: Only essential progress tracking fields

## Recommended Database Indexes

For optimal performance, create the following indexes in MongoDB:

```javascript
// Students collection
db.students.createIndex({ lrn: 1 }, { unique: true });
db.students.createIndex({ barangayId: 1 });
db.students.createIndex({ name: 1 });
db.students.createIndex({ status: 1 });

// Progress collection
db.progress.createIndex({ studentId: 1 });
db.progress.createIndex({ moduleId: 1 });
db.progress.createIndex({ studentId: 1, moduleId: 1 });

// Modules collection
db.modules.createIndex({ barangayId: 1 });
db.modules.createIndex({ title: 1 });
db.modules.createIndex({ createdAt: -1 });

// Barangays collection
db.barangays.createIndex({ name: 1 });
```

## Performance Metrics to Monitor

1. **First Contentful Paint (FCP)**: Should be < 1.8s
2. **Largest Contentful Paint (LCP)**: Should be < 2.5s
3. **Time to Interactive (TTI)**: Should be < 3.8s
4. **Total Blocking Time (TBT)**: Should be < 200ms
5. **Cumulative Layout Shift (CLS)**: Should be < 0.1

## Additional Recommendations

1. **CDN**: Consider using a CDN for static assets
2. **Service Worker**: Implement service worker for offline support and caching
3. **Database Connection Pooling**: Already implemented via `clientPromise`
4. **API Rate Limiting**: Consider adding rate limiting for production
5. **Monitoring**: Set up performance monitoring (e.g., Vercel Analytics, Sentry)

## Build Optimization

The build process is optimized with:
- SWC minification (faster than Terser)
- Deterministic module IDs for better caching
- Runtime chunk splitting
- Vendor chunk separation

## Testing Performance

Run the following to test build performance:

```bash
npm run build
```

Check the build output for:
- Bundle sizes
- First Load JS size
- Route sizes
- Shared chunks
