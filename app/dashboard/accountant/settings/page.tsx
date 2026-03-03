import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccountantSettingsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
      <Card>
        <CardHeader>
          <CardTitle>Accountant Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Manage your professional profile, notification preferences, and
            organization settings.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
