import { motion } from "framer-motion";

const SkeletonLoader = ({ className = "h-4 w-full bg-slate-200 rounded", ...props }) => {
  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.8,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut"
      }}
      className={`bg-slate-200 ${className}`}
      {...props}
    />
  );
};

// Preset Skeletons for faster implementation
export const CardSkeleton = () => (
    <div className="bg-white rounded-3xl border border-gray-100 p-5 shadow-sm flex flex-col w-full h-full">
        {/* Header Image Skeleton */}
        <div className="flex gap-4 mb-4">
            <SkeletonLoader className="w-16 h-16 rounded-2xl shrink-0" />
            <div className="flex-1 py-1 space-y-2">
                <SkeletonLoader className="h-5 w-3/4 rounded-md" />
                <SkeletonLoader className="h-4 w-1/3 rounded-md" />
            </div>
            <SkeletonLoader className="w-12 h-5 rounded-full" />
        </div>
        
        {/* Body Content Skeleton */}
        <div className="bg-slate-50 p-4 rounded-2xl mb-4 border border-slate-100/50 flex flex-col gap-3 flex-1">
            <SkeletonLoader className="h-4 w-5/6 rounded-md" />
            <SkeletonLoader className="h-4 w-1/2 rounded-md" />
        </div>
        
        {/* Footer Skeleton */}
        <div className="flex justify-between items-end mt-auto pt-2">
            <div className="space-y-1">
                <SkeletonLoader className="h-3 w-16 rounded-sm" />
                <SkeletonLoader className="h-6 w-24 rounded-md" />
            </div>
            <SkeletonLoader className="h-10 w-28 rounded-xl" />
        </div>
    </div>
);

export default SkeletonLoader;
