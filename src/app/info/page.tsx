'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { Shield, Server, Clock, Lock, Code, FileText, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function InfoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      {/* Header */}
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Upload
              </Button>
            </Link>
          </div>
          
          <ThemeToggle />
        </div>

        {/* Title Section */}
        <div className="text-center mb-12">
          <div className="mx-auto mb-6 h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-4">OpenFiles</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Veilige en tijdelijke bestandsdeling met end-to-end encryptie
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-12">
          <Card>
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900 flex items-center justify-center mb-2">
                <Shield className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-lg">Volledig Geencrypt</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Alle bestanden worden geencrypt met AES-256-CBC encryptie. Zelfs wij kunnen uw bestanden niet bekijken.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-2">
                <Server className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-lg">Nederlandse Datacenter</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Uw data wordt opgeslagen in beveiligde datacenters in Nederland, conform GDPR-wetgeving.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-orange-100 dark:bg-orange-900 flex items-center justify-center mb-2">
                <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              </div>
              <CardTitle className="text-lg">Automatisch Verwijderd</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Bestanden worden automatisch verwijderd na 7 dagen (of eerder indien door u ingesteld).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-2">
                <Lock className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle className="text-lg">Geen Permanente Opslag</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We bewaren geen bestanden permanent. Alles wordt tijdelijk opgeslagen voor veilige overdracht.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-teal-100 dark:bg-teal-900 flex items-center justify-center mb-2">
                <Code className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <CardTitle className="text-lg">Open Source</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Volledige transparantie - alle code is open source en publiek beschikbaar voor controle.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900 flex items-center justify-center mb-2">
                <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-lg">Geen Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We volgen u niet en verkopen geen data. Uw privacy staat centraal in alles wat we doen.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How it Works */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">Hoe het werkt</CardTitle>
            <CardDescription>
              Een eenvoudig en veilig proces voor bestandsdeling
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary font-bold">1</span>
                </div>
                <h3 className="font-semibold mb-2">Upload uw bestand</h3>
                <p className="text-sm text-muted-foreground">
                  Selecteer uw bestand en voer het e-mailadres van de ontvanger in
                </p>
              </div>
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary font-bold">2</span>
                </div>
                <h3 className="font-semibold mb-2">Automatische encryptie</h3>
                <p className="text-sm text-muted-foreground">
                  Het bestand wordt geencrypt en veilig opgeslagen in ons Nederlandse datacenter
                </p>
              </div>
              <div className="text-center">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <span className="text-primary font-bold">3</span>
                </div>
                <h3 className="font-semibold mb-2">Veilige download</h3>
                <p className="text-sm text-muted-foreground">
                  De ontvanger krijgt een e-mail met een beveiligde download link
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Details */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="text-2xl">Technische Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-semibold mb-2">Encryptie</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• AES-256-CBC encryptie voor alle bestanden</li>
                  <li>• Unieke encryptiesleutel per bestand</li>
                  <li>• Bestandsnamen worden ook geencrypt</li>
                  <li>• End-to-end beveiliging</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Opslag & Privacy</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Nederlandse datacenters (GDPR compliant)</li>
                  <li>• Maximaal 7 dagen opslag</li>
                  <li>• Geen permanente opslag van bestanden</li>
                  <li>• Automatische verwijdering na vervaldatum</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CTA Section */}
        <div className="text-center">
          <Link href="/">
            <Button size="lg" className="gap-2">
              <FileText className="h-5 w-5" />
              Begin met uploaden
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}