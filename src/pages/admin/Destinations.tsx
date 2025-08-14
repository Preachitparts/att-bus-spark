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

interface Destination {
  id: string;
  name: string;
  price: number;
  active: boolean;
  created_at: string;
}

export default function Destinations() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    active: true,
  });

  useEffect(() => {
    loadDestinations();
  }, []);

  async function loadDestinations() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("destinations")
        .select("*")
        .order("name");

      if (error) throw error;
      setDestinations(data || []);
    } catch (error) {
      console.error("Error loading destinations:", error);
      toast({ title: "Error", description: "Failed to load destinations" });
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.price) {
      toast({ title: "Error", description: "Please fill in all fields" });
      return;
    }

    try {
      const price = parseFloat(formData.price);
      if (isNaN(price) || price < 0) {
        toast({ title: "Error", description: "Please enter a valid price" });
        return;
      }

      if (editingDestination) {
        const { error } = await supabase
          .from("destinations")
          .update({
            name: formData.name.trim(),
            price,
            active: formData.active,
          })
          .eq("id", editingDestination.id);

        if (error) throw error;
        toast({ title: "Success", description: "Destination updated successfully" });
      } else {
        const { error } = await supabase
          .from("destinations")
          .insert({
            name: formData.name.trim(),
            price,
            active: formData.active,
          });

        if (error) throw error;
        toast({ title: "Success", description: "Destination created successfully" });
      }

      setFormData({ name: "", price: "", active: true });
      setEditingDestination(null);
      setIsDialogOpen(false);
      loadDestinations();
    } catch (error: any) {
      console.error("Error saving destination:", error);
      if (error.code === '23505') {
        toast({ title: "Error", description: "A destination with this name already exists" });
      } else {
        toast({ title: "Error", description: "Failed to save destination" });
      }
    }
  }

  async function handleDelete(destination: Destination) {
    if (!confirm(`Are you sure you want to delete "${destination.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from("destinations")
        .delete()
        .eq("id", destination.id);

      if (error) throw error;
      toast({ title: "Success", description: "Destination deleted successfully" });
      loadDestinations();
    } catch (error: any) {
      console.error("Error deleting destination:", error);
      if (error.code === '23503') {
        toast({ title: "Error", description: "Cannot delete destination with existing bookings" });
      } else {
        toast({ title: "Error", description: "Failed to delete destination" });
      }
    }
  }

  function openEditDialog(destination: Destination) {
    setEditingDestination(destination);
    setFormData({
      name: destination.name,
      price: destination.price.toString(),
      active: destination.active,
    });
    setIsDialogOpen(true);
  }

  function openCreateDialog() {
    setEditingDestination(null);
    setFormData({ name: "", price: "", active: true });
    setIsDialogOpen(true);
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-6">Manage Destinations</h1>
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
        <h1 className="text-2xl font-semibold">Manage Destinations</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Add Destination
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingDestination ? "Edit Destination" : "Add New Destination"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Destination Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Kumasi"
                  required
                />
              </div>
              <div>
                <Label htmlFor="price">Price (GHS)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
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
                  {editingDestination ? "Update" : "Create"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {destinations.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No destinations found</p>
            </CardContent>
          </Card>
        ) : (
          destinations.map((destination) => (
            <Card key={destination.id}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{destination.name}</h3>
                    <p className="text-muted-foreground">GHS {Number(destination.price).toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      Status: {destination.active ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(destination)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(destination)}
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