'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download } from 'lucide-react';

export interface PdfExportOptions {
  district: string;
  clcName: string;
  division: string;
  clcType: string;
  region: string;
  exportedBy: string;
  exportDate: string;
}

interface PdfExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (options: PdfExportOptions) => void;
  userName: string;
}

export function PdfExportDialog({
  open,
  onOpenChange,
  onExport,
  userName,
}: PdfExportDialogProps) {
  const [district, setDistrict] = useState('ALFONSO');
  const [clcName, setClcName] = useState('PULO BRGY. HALL (11714264)');
  const [division, setDivision] = useState('CAVITE');
  const [clcType, setClcType] = useState('Type 1');
  const [region, setRegion] = useState('REGION IV-A (CALABARZON)');

  const handleExport = () => {
    const now = new Date();
    const exportDate = now.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    onExport({
      district,
      clcName,
      division,
      clcType,
      region,
      exportedBy: userName,
      exportDate,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export to PDF</DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="district" className="text-right">
              District
            </Label>
            <Input
              id="district"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="division" className="text-right">
              Division
            </Label>
            <Input
              id="division"
              value={division}
              onChange={(e) => setDivision(e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="region" className="text-right">
              Region
            </Label>
            <Input
              id="region"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="clcName" className="text-right">
              Name of CLC
            </Label>
            <Input
              id="clcName"
              value={clcName}
              onChange={(e) => setClcName(e.target.value)}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="clcType" className="text-right">
              Type of CLC
            </Label>
            <Input
              id="clcType"
              value={clcType}
              onChange={(e) => setClcType(e.target.value)}
              className="col-span-3"
            />
          </div>

          <div className="border-t pt-4 mt-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-muted-foreground">
                Exported By
              </Label>
              <div className="col-span-3 text-sm font-medium">
                {userName}
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4 mt-2">
              <Label className="text-right text-muted-foreground">
                Export Date
              </Label>
              <div className="col-span-3 text-sm font-medium">
                {new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleExport} className="bg-red-600 hover:bg-red-500">
            <Download className="mr-2 h-4 w-4" /> Export PDF
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
