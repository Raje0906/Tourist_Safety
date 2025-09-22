import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, MapPin, Upload } from 'lucide-react';

interface Authority {
  id: string;
  name: string;
  type: string;
  jurisdiction: string;
}

interface EFIRFormProps {
  touristId: string;
  onSuccess?: (efir: any) => void;
  onCancel?: () => void;
}

export default function EFIRForm({ touristId, onSuccess, onCancel }: EFIRFormProps) {
  const [authorities, setAuthorities] = useState<Authority[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    incidentType: '',
    location: '',
    locationLat: '',
    locationLng: '',
    description: '',
    authorityContacted: '',
    evidenceFiles: [] as string[]
  });

  useEffect(() => {
    fetchAuthorities();
  }, []);

  const fetchAuthorities = async () => {
    try {
      const response = await fetch('/api/authorities');
      const data = await response.json();
      setAuthorities(data.authorities || []);
    } catch (error) {
      console.error('Error fetching authorities:', error);
      setError('Failed to load authorities');
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            locationLat: position.coords.latitude.toString(),
            locationLng: position.coords.longitude.toString()
          }));
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Failed to get current location');
        }
      );
    } else {
      setError('Geolocation is not supported by this browser');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const uploadedFiles: string[] = [];
    
    // Simulate file upload (in production, upload to cloud storage)
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const mockUrl = `https://storage.example.com/evidence/${Date.now()}_${file.name}`;
      uploadedFiles.push(mockUrl);
    }

    setFormData(prev => ({
      ...prev,
      evidenceFiles: [...prev.evidenceFiles, ...uploadedFiles]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate form
      if (!formData.incidentType || !formData.location || !formData.description || !formData.authorityContacted) {
        throw new Error('Please fill in all required fields');
      }

      const efirData = {
        touristId,
        filedBy: touristId, // In production, this would be the current user ID
        ...formData,
        locationLat: formData.locationLat ? parseFloat(formData.locationLat) : undefined,
        locationLng: formData.locationLng ? parseFloat(formData.locationLng) : undefined,
      };

      const response = await fetch('/api/efirs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(efirData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to file E-FIR');
      }

      const result = await response.json();
      setSuccess(`E-FIR filed successfully! FIR Number: ${result.efir.firNumber}`);
      
      if (onSuccess) {
        onSuccess(result.efir);
      }

      // Reset form
      setFormData({
        incidentType: '',
        location: '',
        locationLat: '',
        locationLng: '',
        description: '',
        authorityContacted: '',
        evidenceFiles: []
      });

    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          File Electronic FIR (E-FIR)
        </CardTitle>
        <CardDescription>
          Report an incident and automatically generate an Electronic First Information Report
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Incident Type */}
          <div className="space-y-2">
            <Label htmlFor="incidentType">Incident Type *</Label>
            <Select onValueChange={(value) => handleInputChange('incidentType', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select incident type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="theft">Theft</SelectItem>
                <SelectItem value="assault">Assault</SelectItem>
                <SelectItem value="fraud">Fraud</SelectItem>
                <SelectItem value="harassment">Harassment</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location *</Label>
            <div className="flex gap-2">
              <Input
                id="location"
                placeholder="Enter incident location"
                value={formData.location}
                onChange={(e) => handleInputChange('location', e.target.value)}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={getCurrentLocation}
                className="flex items-center gap-1"
              >
                <MapPin className="h-4 w-4" />
                Current
              </Button>
            </div>
          </div>

          {/* Coordinates (auto-filled) */}
          {(formData.locationLat || formData.locationLng) && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="locationLat">Latitude</Label>
                <Input
                  id="locationLat"
                  placeholder="Latitude"
                  value={formData.locationLat}
                  onChange={(e) => handleInputChange('locationLat', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="locationLng">Longitude</Label>
                <Input
                  id="locationLng"
                  placeholder="Longitude"
                  value={formData.locationLng}
                  onChange={(e) => handleInputChange('locationLng', e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Incident Description *</Label>
            <Textarea
              id="description"
              placeholder="Provide detailed description of the incident..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={4}
            />
          </div>

          {/* Authority Contact */}
          <div className="space-y-2">
            <Label htmlFor="authorityContacted">Contact Authority *</Label>
            <Select onValueChange={(value) => handleInputChange('authorityContacted', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select authority to contact" />
              </SelectTrigger>
              <SelectContent>
                {authorities.map((authority) => (
                  <SelectItem key={authority.id} value={authority.id}>
                    {authority.name} ({authority.type}) - {authority.jurisdiction}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Evidence Upload */}
          <div className="space-y-2">
            <Label htmlFor="evidence">Evidence Files (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="evidence"
                type="file"
                multiple
                accept="image/*,video/*,.pdf"
                onChange={handleFileUpload}
                className="flex-1"
              />
              <Upload className="h-4 w-4 text-muted-foreground" />
            </div>
            {formData.evidenceFiles.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {formData.evidenceFiles.length} file(s) uploaded
              </div>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Filing E-FIR...' : 'File E-FIR'}
            </Button>
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
"