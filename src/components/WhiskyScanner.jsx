import { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  CircularProgress,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Paper,
} from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { PhotoCamera, Compare, Info } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { recognizeWhiskyLabel } from '../api/whiskyRecognition';

function WhiskyScanner() {
  const [image, setImage] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedBottle, setSelectedBottle] = useState(null);

  const onDrop = (acceptedFiles) => {
    if (acceptedFiles?.length > 0) {
      setImage(acceptedFiles[0]);
      setError(null);
      handleScan(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    maxFiles: 1,
  });

  const handleScan = async (file) => {
    setScanning(true);
    setResults(null);
    try {
      const response = await recognizeWhiskyLabel(file);
      // Enhanced debug logging
      console.log('Backend response:', response);
      if (!response.success) {
        setError(response.error || 'Recognition failed');
        return;
      }
      setResults(response.results);
    } catch (err) {
      setError('Failed to process image. Please try again.');
      // Show error details in the UI for debugging
      alert('Scan error: ' + (err?.message || err));
      console.error('Scan error:', err);
    } finally {
      setScanning(false);
    }
  };

  const handleDetailsClick = (bottle) => {
    setSelectedBottle(bottle);
    setDetailsOpen(true);
  };

  return (
    <Box sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom align="center" sx={{ mb: 4 }}>
        Whisky Label Scanner
      </Typography>

      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Card
            {...getRootProps()}
            sx={{
              height: 400,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
            }}
          >
            <input {...getInputProps()} />
            {image ? (
              <Box
                component="img"
                src={URL.createObjectURL(image)}
                alt="Selected whisky"
                sx={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
              />
            ) : (
              <Box sx={{ textAlign: 'center', p: 2 }}>
                <PhotoCamera sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  Drag & drop an image here, or click to select
                </Typography>
              </Box>
            )}
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          {scanning ? (
            <Card sx={{ height: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box sx={{ textAlign: 'center' }}>
                <CircularProgress size={60} sx={{ mb: 2 }} />
                <Typography variant="h6">Analyzing Image...</Typography>
              </Box>
            </Card>
          ) : results ? (
            <Card sx={{ height: 400, overflow: 'auto' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Results</Typography>
                {results.map((bottle, index) => (
                  <Paper
                    key={index}
                    elevation={1}
                    sx={{ p: 2, mb: 2, position: 'relative' }}
                  >
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={8}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {bottle.name}
                        </Typography>
                        <Box sx={{ mt: 1 }}>
                          <Chip
                            label={bottle.type}
                            size="small"
                            sx={{ mr: 1, mb: 1 }}
                          />
                          <Chip
                            label={`${bottle.abv}% ABV`}
                            size="small"
                            sx={{ mr: 1, mb: 1 }}
                          />
                          <Chip
                            label={`${bottle.size_ml}ml`}
                            size="small"
                            sx={{ mb: 1 }}
                          />
                        </Box>
                      </Grid>
                      <Grid item xs={12} sm={4} sx={{ textAlign: 'right' }}>
                        <Typography variant="h6" color="primary">
                          ${bottle.msrp}
                        </Typography>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Info />}
                          onClick={() => handleDetailsClick(bottle)}
                          sx={{ mt: 1 }}
                        >
                          Details
                        </Button>
                      </Grid>
                      <Grid item xs={12} sm={4} sx={{ textAlign: 'center' }}>
                        {bottle.image_url && (
                          <Box
                            component="img"
                            src={`/images/${bottle.image_url.split(/[\\/]/).pop()}`}
                            alt={bottle.name}
                            sx={{ maxHeight: 100, maxWidth: 120, objectFit: 'contain', borderRadius: 2, boxShadow: 1, background: '#fafafa', p: 0.5 }}
                          />
                        )}
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Confidence Score
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={bottle.confidence * 100}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                        <Typography variant="body2" color="text.secondary" align="right" sx={{ mt: 0.5 }}>
                          {(bottle.confidence * 100).toFixed(1)}%
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                ))}
              </CardContent>
            </Card>
          ) : error ? (
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          ) : null}
        </Grid>
      </Grid>

      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        {selectedBottle && (
          <>
            <DialogTitle>{selectedBottle.name} Details</DialogTitle>
            <DialogContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Specifications</Typography>
                  <Typography><strong>Type:</strong> {selectedBottle.type}</Typography>
                  <Typography><strong>Size:</strong> {selectedBottle.size_ml}ml</Typography>
                  <Typography><strong>ABV:</strong> {selectedBottle.abv}%</Typography>
                  <Typography><strong>MSRP:</strong> ${selectedBottle.msrp}</Typography>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Price Comparison</Typography>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={[
                        { name: 'Average', price: selectedBottle.msrp * 0.9 },
                        { name: 'Current', price: selectedBottle.msrp },
                        { name: 'High', price: selectedBottle.msrp * 1.1 },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="price" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button
                startIcon={<Compare />}
                onClick={() => window.open('https://example.com/compare', '_blank')}
              >
                Compare Prices
              </Button>
              <Button onClick={() => setDetailsOpen(false)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}

export default WhiskyScanner;