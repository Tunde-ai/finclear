import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function BudgetsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Budgets</h2>
        <Button className="gap-2">
          <Plus className="h-4 w-4" /> Create Budget
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your Budgets</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            No budgets set up yet. Create your first budget to start tracking
            spending by category.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
