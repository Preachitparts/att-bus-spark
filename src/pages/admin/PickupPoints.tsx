import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface PickupPoint {
  id: string;
  name: string;
  active: boolean;
  created_at: string;
}

export default function PickupPoints() {
  const [pickupPoints, setPickupPoints] = useState<PickupPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPoint, setEditingPoint] = useState<PickupPoint | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    active: true,
  });

  useEffect(() => {
    loadPickupPoints();
  }, []);

  async function loadPickupPoints() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("pickup_points")
        .select("*")
        .order("name");

      if (error) throw error;
      setPickupPoints(data || []);
    } catch (error) {
      console.error("Error loading pickup points:", error);
      toast({ title: "Error", description: "Failed to load pickup points" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({ title: "Error", description: "Please enter a pickup point name" });
      return;
    }

    try {
      if (editingPoint) {
        const { error } = await supabase
          .from("pickup_points")
          .update({
            name: formData.name.trim(),
            active: formData.active,
          })
          .eq("id", editingPoint.id);

        if (error) throw error;
        toast({ title: "Success", description: "Pickup point updated successfully" });
      } else {
        const { error } = await supabase
          .from("pickup_points")
          .insert({
            name: formData.name.trim(),
            active: formData.active,
          });

        if (error) throw error;
        toast({ title: "Success", description: "Pickup point created successfully" });
      }

      setFormData({ name: "", active: true });
      setEditingPoint(null);
      setIsDialogOpen(false);
      loadPickupPoints();
    } catch (error: any) {
      console.error("Error saving pickup point:", error);
      if (error.code === '23505') {
        toast({ title: "Error", description: "A pickup point with this name already exists" });
      } else {
        toast({ title: "Error", description: "Failed to save pickup point" });
      }
    }
  }

  async function handleDelete(point: PickupPoint) {
    if (!confirm(`Are you sure you want to delete "${point.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("pickup_points")
        .delete()
        .eq("id", point.id);

      if (error) throw error;
      toast({ title: "Success", description: "Pickup point deleted successfully" });
      loadPickupPoints();
    } catch (error: any) {
      console.error("Error deleting pickup point:", error);
      if (error.code === '23503') {
        toast({ title: "Error", description: "Cannot delete pickup point with existing bookings" });
      } else {
        toast({ title: "Error", description: "Failed to delete pickup point" });
      }
    }
  }

  function openEditDialog(point: PickupPoint) {
    setEditingPoint(point);
    setFormData({
      name: point.name,
      active: point.active,
    });
    setIsDialogOpen(true);
  }

  function openCreateDialog() {
    setEditingPoint(null);
    setFormData({ name: "", active: true });
    setIsDialogOpen(true);
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-6">Manage Pickup Points</h1>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Manage Pickup Points</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Pickup Point
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingPoint ? "Edit Pickup Point" : "Add New Pickup Point"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Pickup Point Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Main Campus"
                  required
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label htmlFor="active">Active</Label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPoint ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {pickupPoints.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No pickup points found</p>
            </CardContent>
          </Card>
        ) : (
          pickupPoints.map((point) => (
            <Card key={point.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{point.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Status: {point.active ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(point)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(point)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}