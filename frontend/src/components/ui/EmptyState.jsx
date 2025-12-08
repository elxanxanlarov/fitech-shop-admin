import { Users, Package, FileText, Search, AlertCircle } from 'lucide-react';

const EmptyState = ({ 
  icon = 'users',
  title = "No data found",
  description = "There are no items to display at the moment.",
  actionText = "Add new item",
  onAction,
  showAction = true
}) => {
  const iconMap = {
    users: Users,
    package: Package,
    file: FileText,
    search: Search,
    alert: AlertCircle
  };

  const IconComponent = iconMap[icon] || Users;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <IconComponent className="w-8 h-8 text-gray-400" />
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {title}
      </h3>
      
      <p className="text-gray-500 text-center max-w-sm mb-6">
        {description}
      </p>
      
      {showAction && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
