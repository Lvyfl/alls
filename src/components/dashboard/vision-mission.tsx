'use client';

import { Eye, Target } from 'lucide-react';

export function VisionMission() {
  return (
    <div className="vision-mission-container h-full flex flex-col space-y-4 sm:space-y-6">
      {/* Vision Section */}
      <div className="bg-blue-600 dark:bg-blue-700 rounded-lg shadow-lg text-white border-4 border-blue-600 dark:border-blue-500 flex-1 flex flex-col overflow-hidden">
        {/* Vision Header */}
        <div className="p-3 sm:p-4 border-b border-blue-500 dark:border-blue-400 flex-shrink-0">
          <div className="flex items-center justify-center space-x-2 sm:space-x-3">
            <Eye className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold">VISION</h2>
          </div>
        </div>

        {/* Vision Content */}
        <div className="p-4 sm:p-6 flex-1 flex items-center justify-center">
          <p className="text-white leading-relaxed text-sm sm:text-base text-center">
            To provide accessible, quality, and relevant alternative learning opportunities that empower out-of-school youth and adults to develop their full potential, acquire essential life skills, and become productive members of society through flexible and innovative educational approaches.
          </p>
        </div>
      </div>

      {/* Mission Section */}
      <div className="bg-blue-600 dark:bg-blue-700 rounded-lg shadow-lg text-white border-4 border-blue-600 dark:border-blue-500 flex-1 flex flex-col overflow-hidden">
        {/* Mission Header */}
        <div className="p-3 sm:p-4 border-b border-blue-500 dark:border-blue-400 flex-shrink-0">
          <div className="flex items-center justify-center space-x-2 sm:space-x-3">
            <Target className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0" />
            <h2 className="text-lg sm:text-xl font-bold">MISSION</h2>
          </div>
        </div>

        {/* Mission Content */}
        <div className="p-4 sm:p-6 flex-1 flex items-center justify-center">
          <p className="text-white leading-relaxed text-sm sm:text-base text-center">
            We are committed to delivering comprehensive alternative learning programs that bridge educational gaps, promote lifelong learning, and foster personal growth through community-based, learner-centered approaches that respect diverse backgrounds and learning needs.
          </p>
        </div>
      </div>
    </div>
  );
}
