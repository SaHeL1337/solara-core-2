import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default function Buildings() {
  const buildingList = [
    { name: "Solar Array", level: 5, status: "Active", wood: 500, gold: 100 },
    {
      name: "Iron Mine",
      level: 2,
      status: "Upgrading (2:00)",
      wood: 800,
      gold: 300,
    },
  ];

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {buildingList.map((b) => (
        <Card
          key={b.name}
          className="bg-slate-900 border-slate-800 text-slate-100"
        >
          <CardHeader>
            <CardTitle>{b.name}</CardTitle>
            <CardDescription className="text-blue-400">
              Level {b.level}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between text-sm mb-4">
              <span>Cost: {b.wood} Wood</span>
              <span className="text-slate-500">{b.status}</span>
            </div>
            <Button className="w-full bg-slate-800 hover:bg-slate-700">
              Upgrade
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
