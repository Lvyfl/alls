'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { geocodeAddress, validateCoordinates, searchAddressSuggestions, AddressSuggestion } from '@/utils/geocoding';
import { MapPin, Loader2, AlertCircle, XCircle } from 'lucide-react';

interface AddBarangayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

// Predefined barangay options
const BARANGAY_OPTIONS = [
  'Agus-us',
  'Alulod',
  'Banaba Cerca',
  'Banaba Lejos',
  'Bancod',
  'Barangay 2 (Poblacion)',
  'Barangay 3 (Poblacion)',
  'Barangay 4 (Poblacion)',
  'Buna Cerca',
  'Buna Lejos I',
  'Buna Lejos II',
  'Calumpang Cerca',
  'Carasuchi',
  'Daine I',
  'Daine II',
  'Guyam Malaki',
  'Guyam Munti',
  'Harasan',
  'Kayquit I',
  'Kayquit II',
  'Kayquit III',
  'Kaytambog',
  'Kaytapos',
  'Limbon',
  'Lumampong Balagbag',
  'Lumampong Halayhay',
  'Mahabangkahoy Cerca',
  'Mahabangkahoy Lejos',
  'Mataas na Lupa',
  'Tambo Balagbag',
  'Tambo Ilaya',
  'Tambo Kulit',
  'Tambo Malaki',
];

export function AddBarangayDialog({
  open,
  onOpenChange,
  onSuccess,
}: AddBarangayDialogProps) {
  const [selectedBarangay, setSelectedBarangay] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [latitude, setLatitude] = useState<string>('');
  const [longitude, setLongitude] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDuplicateError, setIsDuplicateError] = useState(false);
  const [isAddressMismatchError, setIsAddressMismatchError] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [useCustom, setUseCustom] = useState(false);
  const [useManualCoordinates, setUseManualCoordinates] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearchingSuggestions, setIsSearchingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounced address search for suggestions
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (address.trim().length < 3) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearchingSuggestions(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const suggestions = await searchAddressSuggestions(address.trim());
        setAddressSuggestions(suggestions);
        setShowSuggestions(suggestions.length > 0);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setAddressSuggestions([]);
      } finally {
        setIsSearchingSuggestions(false);
      }
    }, 500); // 500ms debounce

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [address]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectSuggestion = (suggestion: AddressSuggestion) => {
    setAddress(suggestion.displayName);
    setLatitude(suggestion.latitude.toString());
    setLongitude(suggestion.longitude.toString());
    setShowSuggestions(false);
    setSuccessMessage(`Coordinates found: ${suggestion.latitude.toFixed(6)}, ${suggestion.longitude.toFixed(6)}`);
  };

  const handleOpenChange = (open: boolean) => {
    if (!isSubmitting && !isGeocoding) {
      setError(null);
      setIsDuplicateError(false);
      setIsAddressMismatchError(false);
      setSuccessMessage(null);
      setSelectedBarangay('');
      setCustomName('');
      setAddress('');
      setAddressSuggestions([]);
      setShowSuggestions(false);
      setLatitude('');
      setLongitude('');
      setUseCustom(false);
      setUseManualCoordinates(false);
      onOpenChange(open);
    }
  };

  const handleGeocodeAddress = async () => {
    if (!address.trim()) {
      setError('Please enter an address to geocode');
      return;
    }

    setIsGeocoding(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await geocodeAddress(address.trim());

      if (result) {
        setLatitude(result.latitude.toString());
        setLongitude(result.longitude.toString());
        setSuccessMessage(`Coordinates found: ${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`);
      } else {
        setError('Could not find coordinates for this address. Please enter coordinates manually.');
        setUseManualCoordinates(true);
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      setError('Failed to geocode address. Please enter coordinates manually.');
      setUseManualCoordinates(true);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const barangayName = useCustom ? customName.trim() : selectedBarangay;

      if (!barangayName) {
        setError('Please select or enter a barangay name');
        setIsSubmitting(false);
        return;
      }

      // Validate that address matches barangay name if address is provided
      if (address.trim()) {
        const normalizedBarangayName = barangayName.toLowerCase().trim();
        const normalizedAddress = address.toLowerCase().trim();
        
        // Check if address contains the barangay name
        // Also handle cases where barangay name might have variations (e.g., "Barangay 2" vs "Barangay 2 (Poblacion)")
        const barangayNameWords = normalizedBarangayName.split(/\s+/).filter(word => 
          word.length > 2 && 
          !['barangay', 'poblacion', 'cerca', 'lejos', 'i', 'ii', 'iii'].includes(word)
        );
        
        const addressContainsBarangay = normalizedAddress.includes(normalizedBarangayName) ||
          (barangayNameWords.length > 0 && barangayNameWords.some(word => normalizedAddress.includes(word)));
        
        if (!addressContainsBarangay) {
          setIsAddressMismatchError(true);
          setError('Wrong barangay: The address does not match the selected barangay name. Please ensure the address contains the barangay name.');
          setIsSubmitting(false);
          return;
        }
      }

      // Clear address mismatch error if validation passes
      setIsAddressMismatchError(false);

      // Prepare barangay data
      const barangayData: {
        name: string;
        address?: string;
        latitude?: number;
        longitude?: number;
      } = {
        name: barangayName,
      };

      // Add address if provided
      if (address.trim()) {
        barangayData.address = address.trim();
      }

      // Add coordinates if provided
      if (latitude.trim() && longitude.trim()) {
        const lat = parseFloat(latitude.trim());
        const lon = parseFloat(longitude.trim());

        if (isNaN(lat) || isNaN(lon)) {
          setError('Invalid coordinates. Please enter valid numbers.');
          setIsSubmitting(false);
          return;
        }

        if (!validateCoordinates(lat, lon)) {
          setError('Coordinates are outside the expected range for Indang, Cavite. Please verify.');
          setIsSubmitting(false);
          return;
        }

        barangayData.latitude = lat;
        barangayData.longitude = lon;
      }

      // Call the API to create the barangay
      const response = await fetch('/api/barangays', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(barangayData),
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        // If JSON parsing fails, use the response status text
        const parseErrorMessage = response.statusText || 'Failed to create barangay';
        setError(parseErrorMessage);
        setIsSubmitting(false);
        return;
      }

      if (!response.ok) {
        const errorMessage = data?.error || data?.message || `Failed to create barangay (${response.status})`;
        const isDuplicate = errorMessage.toLowerCase().includes('already exists') || 
                           errorMessage.toLowerCase().includes('duplicate') ||
                           (response.status === 400 && errorMessage.toLowerCase().includes('barangay'));
        
        setIsDuplicateError(isDuplicate);
        setError(errorMessage);
        setIsSubmitting(false);
        return;
      }

      // Reset form and close dialog
      setSelectedBarangay('');
      setCustomName('');
      setAddress('');
      setLatitude('');
      setLongitude('');
      setUseCustom(false);
      setUseManualCoordinates(false);
      setError(null);
      setIsDuplicateError(false);
      setIsAddressMismatchError(false);
      setSuccessMessage(null);
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      console.error('Error creating barangay:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create barangay';
      
      // Check if it's a duplicate error
      const isDuplicate = errorMessage.toLowerCase().includes('already exists') || 
                         errorMessage.toLowerCase().includes('duplicate') ||
                         (errorMessage.toLowerCase().includes('barangay') && errorMessage.toLowerCase().includes('exists'));
      
      setIsDuplicateError(isDuplicate);
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add New Barangay</DialogTitle>
          <DialogDescription>
            Add a new barangay to the system. You can select from the predefined list or enter a custom name.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="barangay-type">Select or Enter Barangay</Label>
            <Select
              value={useCustom ? 'custom' : 'predefined'}
              onValueChange={(value) => setUseCustom(value === 'custom')}
            >
              <SelectTrigger id="barangay-type">
                <SelectValue placeholder="Choose option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="predefined">Select from list</SelectItem>
                <SelectItem value="custom">Enter custom name</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {useCustom ? (
            <div className="space-y-2">
              <Label htmlFor="custom-name">Barangay Name</Label>
              <Input
                id="custom-name"
                value={customName}
                onChange={(e) => {
                  setCustomName(e.target.value);
                  if (isDuplicateError) {
                    setError(null);
                    setIsDuplicateError(false);
                  }
                }}
                placeholder="Enter barangay name"
                disabled={isSubmitting}
                required
                className={isDuplicateError ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/50' : ''}
              />
              {isDuplicateError && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  This barangay name is already in use. Please choose a different name.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="barangay-select">Select Barangay</Label>
              <Select
                value={selectedBarangay}
                onValueChange={(value) => {
                  setSelectedBarangay(value);
                  if (isDuplicateError) {
                    setError(null);
                    setIsDuplicateError(false);
                  }
                }}
              >
                <SelectTrigger 
                  id="barangay-select"
                  className={isDuplicateError ? 'border-red-500 focus:border-red-500' : ''}
                >
                  <SelectValue placeholder="Select a barangay" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {BARANGAY_OPTIONS.map((barangay) => (
                    <SelectItem key={barangay} value={barangay}>
                      {barangay}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isDuplicateError && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  This barangay is already in the system. Please select a different barangay.
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <div className="relative" ref={suggestionsRef}>
              <div className="flex gap-2">
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    if (isAddressMismatchError) {
                      setError(null);
                      setIsAddressMismatchError(false);
                    }
                  }}
                  onFocus={() => {
                    if (addressSuggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  placeholder="Enter barangay address (e.g., Barangay Name, Indang, Cavite)"
                  disabled={isSubmitting || isGeocoding}
                  className={`flex-1 ${isAddressMismatchError ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/50' : ''}`}
                  autoComplete="off"
                />
                <Button
                  type="button"
                  onClick={handleGeocodeAddress}
                  disabled={!address.trim() || isSubmitting || isGeocoding}
                  variant="outline"
                  className="flex-shrink-0"
                  title="Get coordinates from address"
                >
                  {isGeocoding ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {/* Address Suggestions Dropdown */}
              {showSuggestions && addressSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {isSearchingSuggestions && (
                    <div className="px-3 py-2 text-sm text-gray-500 flex items-center gap-2">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Searching...
                    </div>
                  )}
                  {addressSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.placeId}
                      type="button"
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-slate-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700 dark:text-gray-200 line-clamp-2">
                          {suggestion.displayName}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              
              {/* Loading indicator while searching */}
              {isSearchingSuggestions && !showSuggestions && address.trim().length >= 3 && (
                <div className="absolute right-12 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Start typing to see address suggestions. Select one to auto-fill coordinates, or click the map icon.
            </p>
            {isAddressMismatchError && (
              <p className="text-xs text-red-600 dark:text-red-400">
                ⚠️ The address must contain the barangay name you selected or entered above.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="coordinates">Coordinates (Optional)</Label>
              <button
                type="button"
                onClick={() => setUseManualCoordinates(!useManualCoordinates)}
                className="text-xs text-blue-600 hover:text-blue-700 underline"
              >
                {useManualCoordinates ? 'Hide' : 'Enter manually'}
              </button>
            </div>
            {useManualCoordinates && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="latitude" className="text-xs">Latitude</Label>
                  <Input
                    id="latitude"
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="14.1947"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="longitude" className="text-xs">Longitude</Label>
                  <Input
                    id="longitude"
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="120.8769"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            )}
            {latitude && longitude && !useManualCoordinates && (
              <p className="text-xs text-green-600">
                Coordinates: {parseFloat(latitude).toFixed(6)}, {parseFloat(longitude).toFixed(6)}
              </p>
            )}
          </div>

          {error && (
            <div className={`text-sm bg-red-50 dark:bg-red-900/20 p-4 rounded-md border-2 ${
              isDuplicateError 
                ? 'border-red-500 dark:border-red-600 bg-red-100 dark:bg-red-900/30' 
                : 'border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {isDuplicateError ? (
                    <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className={`font-semibold text-red-800 dark:text-red-300 mb-1 ${
                    isDuplicateError ? 'text-base' : 'text-sm'
                  }`}>
                    {isDuplicateError ? 'Barangay Already Exists' : 'Error'}
                  </p>
                  <p className="text-red-700 dark:text-red-400">
                    {error}
                  </p>
                  {isDuplicateError && (
                    <div className="mt-3 pt-3 border-t border-red-300 dark:border-red-700">
                      <p className="text-xs text-red-600 dark:text-red-400">
                        💡 Tip: Check if the barangay name is spelled correctly or try using a custom name if it's a variation.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {successMessage && (
            <div className="text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
              {successMessage}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || (!useCustom && !selectedBarangay) || (useCustom && !customName.trim())}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              {isSubmitting ? 'Adding...' : 'Add Barangay'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
