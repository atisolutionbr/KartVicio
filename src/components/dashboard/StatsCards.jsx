import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const colorVariants = {
  blue: "from-blue-500 to-blue-600",
  gold: "from-yellow-500 to-yellow-600", 
  green: "from-green-500 to-green-600",
  red: "from-red-500 to-red-600"
};

export default function StatsCards({ title, value, icon: Icon, color = "blue" }) {
  return (
    <Card className="relative overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className={`absolute top-0 right-0 w-24 h-24 opacity-10 transform translate-x-6 -translate-y-6 bg-gradient-to-br ${colorVariants[color]} rounded-full`} />
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <div className={`p-2 rounded-lg bg-gradient-to-br ${colorVariants[color]} bg-opacity-10`}>
          <Icon className={`w-5 h-5 ${color === 'gold' ? 'text-yellow-600' : 
                                       color === 'green' ? 'text-green-600' :
                                       color === 'red' ? 'text-red-600' : 'text-blue-600'}`} />
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="flex items-center pt-1">
          <div className={`h-1 w-8 rounded-full bg-gradient-to-r ${colorVariants[color]}`} />
        </div>
      </CardContent>
    </Card>
  );
}